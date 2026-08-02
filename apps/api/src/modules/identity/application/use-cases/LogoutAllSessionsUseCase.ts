import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface LogoutAllSessionsInput {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/** "Sair de todos os dispositivos" — usa userId do access token, já autenticado. */
export class LogoutAllSessionsUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: LogoutAllSessionsInput): Promise<void> {
    const now = this.clock.now();
    const activeSessions = await this.sessionRepository.findActiveByUserId(input.userId);

    for (const session of activeSessions) {
      session.revoke(now);
      await this.sessionRepository.save(session);
    }

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: input.userId,
      eventType: "SESSIONS_REVOKED_ALL",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { revokedCount: activeSessions.length },
    });
    await this.auditLogRepository.append(entry);
  }
}
