import { AppError } from "../../../../application/errors/AppError.js";
import type { IPasswordHasher } from "../../../../application/ports/IPasswordHasher.js";
import type { ITokenProvider } from "../../../../application/ports/ITokenProvider.js";
import { AuditLogEntry, type AuditEventType } from "../../domain/entities/AuditLogEntry.js";
import { RefreshToken } from "../../domain/entities/RefreshToken.js";
import { Session } from "../../domain/entities/Session.js";
import type { User } from "../../domain/entities/User.js";
import { Email } from "../../domain/value-objects/Email.js";
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
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ILoginAttemptTracker } from "../ports/ILoginAttemptTracker.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface LoginInput {
  email: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface LoginOutput {
  accessToken: string;
  /** Token opaco em texto puro — o controller usa isso só para setar o cookie, nunca no corpo JSON. */
  refreshToken: string;
  user: { id: string; email: string; roles: string[] };
}

const GENERIC_LOGIN_ERROR_MESSAGE = "Credenciais inválidas";
const TIMING_SAFETY_DUMMY_PASSWORD = "timing-attack-mitigation-dummy-password";

/**
 * Toda falha (email desconhecido, senha errada, conta trancada/desabilitada,
 * rate-limited) devolve exatamente o mesmo erro genérico ao chamador — só a
 * auditoria interna sabe o motivo real. Ver ADR 0010, seção "não vazar
 * estado de conta".
 */
export class LoginUseCase {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider,
    private readonly tokenHasher: ITokenHasher,
    private readonly loginAttemptTracker: ILoginAttemptTracker,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
    private readonly config: IdentityModuleConfig,
    private readonly tenantRepository: ITenantRepository,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const now = this.clock.now();
    const emailAttemptKey = `email:${input.email.trim().toLowerCase()}`;
    const ipAttemptKey = input.ipAddress ? `ip:${input.ipAddress}` : null;
    const attemptKeys = [emailAttemptKey, ...(ipAttemptKey ? [ipAttemptKey] : [])];

    const attemptStates = await Promise.all(
      attemptKeys.map((key) => this.loginAttemptTracker.getState(key)),
    );
    if (attemptStates.some((state) => state.isBlocked)) {
      await this.appendAudit(null, "LOGIN_RATE_LIMITED", "FAILURE", input);
      throw new AppError("UNAUTHORIZED", GENERIC_LOGIN_ERROR_MESSAGE);
    }

    let email: Email;
    try {
      email = Email.create(input.email);
    } catch {
      await this.recordFailure(null, attemptKeys, "LOGIN_FAILURE_UNKNOWN_EMAIL", input);
      throw new AppError("UNAUTHORIZED", GENERIC_LOGIN_ERROR_MESSAGE);
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Verifica contra um hash "de mentira" pra não vazar, pelo tempo de
      // resposta, se o email existe ou não.
      await this.passwordHasher.verify(input.password, await this.getTimingSafetyDummyHash());
      await this.recordFailure(null, attemptKeys, "LOGIN_FAILURE_UNKNOWN_EMAIL", input);
      throw new AppError("UNAUTHORIZED", GENERIC_LOGIN_ERROR_MESSAGE);
    }

    if (!user.canAuthenticate(now)) {
      const eventType: AuditEventType =
        user.accountStatus === "DISABLED"
          ? "LOGIN_FAILURE_ACCOUNT_DISABLED"
          : "LOGIN_FAILURE_ACCOUNT_LOCKED";
      await this.recordFailure(user.id, attemptKeys, eventType, input);
      throw new AppError("UNAUTHORIZED", GENERIC_LOGIN_ERROR_MESSAGE);
    }

    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user.passwordHash.toString(),
    );

    if (!passwordMatches) {
      user.recordFailedLogin(
        now,
        this.config.accountLockoutThreshold,
        this.config.accountLockoutDurationSeconds,
      );
      await this.userRepository.save(user);
      await this.recordFailure(user.id, attemptKeys, "LOGIN_FAILURE_BAD_PASSWORD", input);
      throw new AppError("UNAUTHORIZED", GENERIC_LOGIN_ERROR_MESSAGE);
    }

    user.recordSuccessfulLogin(now);
    await this.userRepository.save(user);
    await Promise.all(attemptKeys.map((key) => this.loginAttemptTracker.recordSuccess(key)));

    const { session, rawRefreshToken } = this.createSession(user, now, input);
    await this.sessionRepository.save(session);

    const tenantId = await this.resolveOrProvisionTenantId(user);
    const accessToken = this.tokenProvider.signAccessToken(
      { sub: user.id, sid: session.id, roles: user.roles, tenantId },
      this.config.accessTokenTtlSeconds,
    );

    await this.appendAudit(user.id, "LOGIN_SUCCESS", "SUCCESS", input);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email.toString(), roles: user.roles },
    };
  }

  private createSession(
    user: User,
    now: Date,
    input: LoginInput,
  ): { session: Session; rawRefreshToken: string } {
    const sessionId = this.idGenerator.generateId();
    const rawRefreshToken = this.idGenerator.generateSecureToken();
    const refreshTokenExpiresAt = new Date(
      now.getTime() + this.config.refreshTokenTtlSeconds * 1000,
    );
    const familyId = this.idGenerator.generateId();

    const refreshToken = RefreshToken.create({
      id: this.idGenerator.generateId(),
      sessionId,
      tokenHash: this.tokenHasher.hash(rawRefreshToken),
      familyId,
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

    return { session, rawRefreshToken };
  }

  private async recordFailure(
    userId: string | null,
    attemptKeys: string[],
    eventType: AuditEventType,
    input: LoginInput,
  ): Promise<void> {
    await Promise.all(attemptKeys.map((key) => this.loginAttemptTracker.recordFailure(key)));
    await this.appendAudit(userId, eventType, "FAILURE", input);
  }

  private async appendAudit(
    actorUserId: string | null,
    eventType: AuditEventType,
    outcome: "SUCCESS" | "FAILURE",
    input: { ipAddress: string | null; userAgent: string | null },
  ): Promise<void> {
    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: this.clock.now(),
      actorUserId,
      eventType,
      outcome,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: null,
    });
    await this.auditLogRepository.append(entry);
  }

  private async getTimingSafetyDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash(TIMING_SAFETY_DUMMY_PASSWORD);
    return this.dummyHash;
  }

  /**
   * Toda conta criada via `RegisterUseCase`/`OAuthLoginUseCase` já ganha um
   * `TenantResourceOwnership` no cadastro. A ausência aqui só acontece para
   * contas inseridas fora desse fluxo (seed, script administrativo, conta
   * herdada de antes do ADR 0037) — em vez de recusar o login, provisiona o
   * tenant na hora, com a mesma resolução por nome de empresa/domínio de
   * e-mail usada no autocadastro. Autocura, não trava a conta.
   */
  private async resolveOrProvisionTenantId(user: User): Promise<string> {
    const existente = await this.tenantResourceOwnershipRepository.findByResource("User", user.id);
    if (existente) return existente.tenantId;

    const nomeCandidato = resolveTenantCandidateName(user.empresa, user.email.toString(), user.id);
    const slug = Tenant.slugify(nomeCandidato);

    let tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      try {
        tenant = await this.createTenantUseCase.execute({ nome: nomeCandidato, slug });
      } catch (error) {
        if (error instanceof AppError && error.kind === "CONFLICT") {
          tenant = await this.tenantRepository.findBySlug(slug);
        }
        if (!tenant) throw error;
      }
    }

    await this.registerTenantResourceUseCase.execute({
      tenantId: tenant.id,
      resourceType: "User",
      resourceId: user.id,
    });
    return tenant.id;
  }
}
