import { AppError } from "../../../../application/errors/AppError.js";
import type { IPasswordHasher } from "../../../../application/ports/IPasswordHasher.js";
import type { ITokenProvider } from "../../../../application/ports/ITokenProvider.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { RefreshToken } from "../../domain/entities/RefreshToken.js";
import { Session } from "../../domain/entities/Session.js";
import { User } from "../../domain/entities/User.js";
import { AccountStatus } from "../../domain/value-objects/AccountStatus.js";
import { Email } from "../../domain/value-objects/Email.js";
import { PasswordHash } from "../../domain/value-objects/PasswordHash.js";
import { Role } from "../../domain/value-objects/Role.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { CreateTenantUseCase } from "../../../tenant/application/use-cases/CreateTenantUseCase.js";
import type { RegisterTenantResourceUseCase } from "../../../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { Tenant } from "../../../tenant/domain/entities/Tenant.js";
import type { ITenantRepository } from "../../../tenant/domain/repositories/ITenantRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";
import type { IdentityModuleConfig } from "../IdentityModuleConfig.js";
import { resolveTenantCandidateName } from "../resolveTenantCandidateName.js";
import type { OAuthProfile } from "../ports/IOAuthProvider.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface OAuthLoginInput {
  profile: OAuthProfile;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface OAuthLoginOutput {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[] };
}

/**
 * Provisionamento just-in-time: a primeira vez que um e-mail aparece via
 * OAuth, uma `User` é criada automaticamente (papel `VIEWER`, mesmo default
 * de `RegisterUseCase`) — padrão comum em SSO corporativo, evita um passo
 * de "cadastro" redundante quando a identidade já foi verificada por um
 * provedor confiável. A senha é um hash Argon2 de um segredo aleatório de
 * alta entropia, nunca conhecido por ninguém — contas OAuth simplesmente não
 * têm como logar por email/senha, mas o `PasswordHash` (que valida a
 * estrutura `$argon2...`) não precisa de um caso especial para isso.
 *
 * Criação de sessão duplicada deliberadamente de `LoginUseCase` (mesmo
 * princípio de duplicação sobre acoplamento entre use cases já usado no
 * resto da plataforma) — nenhum dos dois chama o outro.
 */
export class OAuthLoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider,
    private readonly tokenHasher: ITokenHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
    private readonly config: IdentityModuleConfig,
    private readonly tenantRepository: ITenantRepository,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(input: OAuthLoginInput): Promise<OAuthLoginOutput> {
    const now = this.clock.now();
    const email = Email.create(input.profile.email);

    let user = await this.userRepository.findByEmail(email);
    let tenantId: string;
    if (!user) {
      const randomSecret = this.idGenerator.generateSecureToken();
      const hash = await this.passwordHasher.hash(randomSecret);
      const [nome, ...sobrenomeParts] = (input.profile.name ?? "").split(" ").filter(Boolean);

      user = User.create({
        id: this.idGenerator.generateId(),
        email,
        passwordHash: PasswordHash.fromHash(hash),
        roles: [Role.VIEWER],
        accountStatus: AccountStatus.ACTIVE,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mfaEnabled: false,
        nome: nome ?? null,
        sobrenome: sobrenomeParts.length > 0 ? sobrenomeParts.join(" ") : null,
        createdAt: now,
        updatedAt: now,
      });
      await this.userRepository.save(user);

      const tenant = await this.resolveOrCreateTenant(null, email, user.id);
      tenantId = tenant.id;
      await this.registerTenantResourceUseCase.execute({
        tenantId,
        resourceType: "User",
        resourceId: user.id,
      });
    } else {
      tenantId = await this.resolveExistingTenantId(user.id, email, user.empresa);
    }

    user.recordSuccessfulLogin(now);
    await this.userRepository.save(user);

    const sessionId = this.idGenerator.generateId();
    const rawRefreshToken = this.idGenerator.generateSecureToken();
    const refreshTokenExpiresAt = new Date(
      now.getTime() + this.config.refreshTokenTtlSeconds * 1000,
    );

    const refreshToken = RefreshToken.create({
      id: this.idGenerator.generateId(),
      sessionId,
      tokenHash: this.tokenHasher.hash(rawRefreshToken),
      familyId: this.idGenerator.generateId(),
      issuedAt: now,
      expiresAt: refreshTokenExpiresAt,
      revokedAt: null,
      replacedByTokenId: null,
    });

    const session = Session.create({
      id: sessionId,
      userId: user.id,
      status: "ACTIVE",
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: refreshTokenExpiresAt,
      currentRefreshToken: refreshToken,
    });
    await this.sessionRepository.save(session);

    const accessToken = this.tokenProvider.signAccessToken(
      { sub: user.id, sid: session.id, roles: user.roles, tenantId },
      this.config.accessTokenTtlSeconds,
    );

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: user.id,
      eventType: "OAUTH_LOGIN_SUCCESS",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: null,
    });
    await this.auditLogRepository.append(entry);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email.toString(), roles: user.roles },
    };
  }

  /** Perfis OAuth não trazem nome de empresa — usa o domínio do e-mail corporativo como candidato a tenant (mesma lógica de `RegisterUseCase`), exceto provedores de e-mail pessoal (ver `resolveTenantCandidateName`). */
  private async resolveOrCreateTenant(
    empresa: string | null,
    email: Email,
    userId: string,
  ): Promise<Tenant> {
    const nomeCandidato = resolveTenantCandidateName(empresa, email.toString(), userId);
    const slug = Tenant.slugify(nomeCandidato);

    const existente = await this.tenantRepository.findBySlug(slug);
    if (existente) return existente;

    try {
      return await this.createTenantUseCase.execute({ nome: nomeCandidato, slug });
    } catch (error) {
      if (error instanceof AppError && error.kind === "CONFLICT") {
        const criadoPorOutraRequisicao = await this.tenantRepository.findBySlug(slug);
        if (criadoPorOutraRequisicao) return criadoPorOutraRequisicao;
      }
      throw error;
    }
  }

  /**
   * Autocura (mesmo espírito de `LoginUseCase.resolveOrProvisionTenantId`):
   * uma conta OAuth que já existia antes do ADR 0037, ou inserida fora do
   * fluxo normal, ganha um tenant na hora em vez de ficar impedida de
   * logar.
   */
  private async resolveExistingTenantId(
    userId: string,
    email: Email,
    empresa: string | null,
  ): Promise<string> {
    const ownership = await this.tenantResourceOwnershipRepository.findByResource("User", userId);
    if (ownership) return ownership.tenantId;

    const tenant = await this.resolveOrCreateTenant(empresa, email, userId);
    await this.registerTenantResourceUseCase.execute({
      tenantId: tenant.id,
      resourceType: "User",
      resourceId: userId,
    });
    return tenant.id;
  }
}
