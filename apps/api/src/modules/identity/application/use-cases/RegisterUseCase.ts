import { AppError } from "../../../../application/errors/AppError.js";
import type { IPasswordHasher } from "../../../../application/ports/IPasswordHasher.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { User } from "../../domain/entities/User.js";
import { AccountStatus } from "../../domain/value-objects/AccountStatus.js";
import { Email } from "../../domain/value-objects/Email.js";
import { PasswordHash } from "../../domain/value-objects/PasswordHash.js";
import { PlainPassword } from "../../domain/value-objects/PlainPassword.js";
import { Role } from "../../domain/value-objects/Role.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { CreateTenantUseCase } from "../../../tenant/application/use-cases/CreateTenantUseCase.js";
import type { RegisterTenantResourceUseCase } from "../../../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { Tenant } from "../../../tenant/domain/entities/Tenant.js";
import type { ITenantRepository } from "../../../tenant/domain/repositories/ITenantRepository.js";
import { resolveTenantCandidateName } from "../resolveTenantCandidateName.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RegisterInput {
  email: string;
  password: string;
  nome: string;
  sobrenome: string;
  empresa: string | null;
  cargo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RegisterOutput {
  id: string;
  email: string;
  nome: string | null;
  sobrenome: string | null;
  roles: string[];
}

/**
 * Autocadastro (fora do escopo original do ADR 0010, que previa só
 * criação de usuário via seed/migration — a fase de UX enterprise pediu um
 * fluxo de cadastro real). Diferente de `LoginUseCase`, aqui a colisão de
 * e-mail É revelada ao chamador (`CONFLICT`, não um erro genérico): o
 * risco de enumeração de contas por tentativa de cadastro é um trade-off de
 * UX aceito universalmente (Stripe, Google, etc. também revelam "e-mail já
 * cadastrado" no cadastro) — o vetor que `LoginUseCase` protege é distinto
 * (adivinhação de credencial/conta existente), não este.
 *
 * Papel padrão é sempre `VIEWER` — autocadastro nunca concede um papel mais
 * privilegiado; elevar papel continua sendo uma operação administrativa
 * separada (fora de escopo, igual ao ADR 0010 original).
 *
 * **Multi-tenant (ADR 0037)**: todo autocadastro resolve ou cria um
 * `Tenant` — pelo nome da empresa informado (`input.empresa`), ou pelo
 * domínio do e-mail se o campo ficou vazio — e registra o novo `User` como
 * recurso daquele tenant via `TenantResourceOwnership`. Duas pessoas que
 * informam o mesmo nome de empresa (normalizado) caem no mesmo tenant de
 * propósito: é assim que colegas da mesma empresa cliente compartilham a
 * mesma carteira. Nenhum usuário nasce sem tenant.
 */
export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
    private readonly tenantRepository: ITenantRepository,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const now = this.clock.now();
    const email = Email.create(input.email);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      await this.appendAudit(existing.id, "REGISTER_FAILURE_EMAIL_TAKEN", "FAILURE", input);
      throw new AppError("CONFLICT", "Este e-mail já está cadastrado");
    }

    const plainPassword = PlainPassword.create(input.password);
    const hash = await this.passwordHasher.hash(plainPassword.reveal());

    const user = User.create({
      id: this.idGenerator.generateId(),
      email,
      passwordHash: PasswordHash.fromHash(hash),
      roles: [Role.VIEWER],
      accountStatus: AccountStatus.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      nome: input.nome,
      sobrenome: input.sobrenome,
      empresa: input.empresa,
      cargo: input.cargo,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepository.save(user);

    const tenant = await this.resolveOrCreateTenant(input.empresa, email, user.id);
    await this.registerTenantResourceUseCase.execute({
      tenantId: tenant.id,
      resourceType: "User",
      resourceId: user.id,
    });

    await this.appendAudit(user.id, "REGISTER_SUCCESS", "SUCCESS", input);

    return {
      id: user.id,
      email: user.email.toString(),
      nome: user.nome,
      sobrenome: user.sobrenome,
      roles: user.roles,
    };
  }

  /**
   * Nunca cria um tenant duplicado para o mesmo nome normalizado: tenta
   * encontrar pelo slug antes de criar, e trata `CONFLICT` (corrida entre
   * dois cadastros simultâneos da mesma empresa) buscando de novo em vez de
   * propagar o erro ao usuário.
   */
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

  private async appendAudit(
    actorUserId: string | null,
    eventType: "REGISTER_SUCCESS" | "REGISTER_FAILURE_EMAIL_TAKEN",
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
}
