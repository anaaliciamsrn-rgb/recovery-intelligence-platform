import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface LogoutInput {
  refreshToken: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Identifica a sessão pelo refresh token do cookie — funciona mesmo com o
 * access token já expirado. Idempotente: token inválido/já revogado não é
 * erro (o objetivo do chamador, "não estar mais logado", já está satisfeito).
 */
export class LogoutUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly tokenHasher: ITokenHasher,
    private readonly clock: IClock,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const now = this.clock.now();
    const hash = this.tokenHasher.hash(input.refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);

    if (!session || !session.isActive(now)) {
      return;
    }

    session.revoke(now);
    await this.sessionRepository.save(session);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: session.userId,
      eventType: "LOGOUT",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { sessionId: session.id },
    });
    await this.auditLogRepository.append(entry);
  }
}
