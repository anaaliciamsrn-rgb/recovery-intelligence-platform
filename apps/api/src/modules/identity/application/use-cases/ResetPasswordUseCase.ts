import { AppError } from "../../../../application/errors/AppError.js";
import type { IPasswordHasher } from "../../../../application/ports/IPasswordHasher.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { PasswordHash } from "../../domain/value-objects/PasswordHash.js";
import { PlainPassword } from "../../domain/value-objects/PlainPassword.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  ipAddress: string | null;
  userAgent: string | null;
}

const GENERIC_TOKEN_ERROR_MESSAGE = "Link de redefinição inválido ou expirado";

/**
 * Conclui o fluxo de "esqueci minha senha". Token inválido, expirado ou já
 * usado devolvem o mesmo erro genérico (mesmo princípio anti-enumeração do
 * resto do módulo). Ao suceder, revoga todas as sessões ativas do usuário —
 * mesma ação de `LogoutAllSessionsUseCase`, replicada aqui deliberadamente
 * (duplicação sobre acoplamento entre use cases, mesmo princípio já usado no
 * resto da plataforma) porque uma senha vazada o suficiente para justificar
 * reset também justifica derrubar qualquer sessão já aberta com a senha antiga.
 */
export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenHasher: ITokenHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const now = this.clock.now();
    const tokenHash = this.tokenHasher.hash(input.token);
    const resetToken = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!resetToken || !resetToken.isValid(now)) {
      await this.appendAudit(
        resetToken?.userId ?? null,
        "PASSWORD_RESET_INVALID_TOKEN",
        "FAILURE",
        input,
      );
      throw new AppError("UNAUTHORIZED", GENERIC_TOKEN_ERROR_MESSAGE);
    }

    const user = await this.userRepository.findById(resetToken.userId);
    if (!user) {
      await this.appendAudit(resetToken.userId, "PASSWORD_RESET_INVALID_TOKEN", "FAILURE", input);
      throw new AppError("UNAUTHORIZED", GENERIC_TOKEN_ERROR_MESSAGE);
    }

    const plainPassword = PlainPassword.create(input.newPassword);
    const hash = await this.passwordHasher.hash(plainPassword.reveal());

    user.changePassword(PasswordHash.fromHash(hash), now);
    await this.userRepository.save(user);

    resetToken.markUsed(now);
    await this.passwordResetTokenRepository.save(resetToken);

    const activeSessions = await this.sessionRepository.findActiveByUserId(user.id);
    for (const session of activeSessions) {
      session.revoke(now);
      await this.sessionRepository.save(session);
    }

    await this.appendAudit(user.id, "PASSWORD_RESET_COMPLETED", "SUCCESS", input);
  }

  private async appendAudit(
    actorUserId: string | null,
    eventType: "PASSWORD_RESET_COMPLETED" | "PASSWORD_RESET_INVALID_TOKEN",
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
