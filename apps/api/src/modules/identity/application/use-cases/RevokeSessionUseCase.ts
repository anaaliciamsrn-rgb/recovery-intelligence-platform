import { AppError } from "../../../../application/errors/AppError.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { RolePermissionPolicy } from "../../domain/services/RolePermissionPolicy.js";
import type { Role } from "../../domain/value-objects/Role.js";
import { Permission } from "../../domain/value-objects/Permission.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RevokeSessionInput {
  sessionId: string;
  requestingUserId: string;
  requestingUserRoles: Role[];
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Autorização composta (dono da sessão OU permissão de admin) — não cabe
 * num `authorizeMiddleware` estático de rota, por isso vive aqui dentro do
 * use case, não numa checagem genérica de permissão na rota.
 */
export class RevokeSessionUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: RevokeSessionInput): Promise<void> {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new AppError("NOT_FOUND", "Sessão não encontrada");
    }

    const isOwner = session.userId === input.requestingUserId;
    const canRevokeAny = RolePermissionPolicy.hasPermission(
      input.requestingUserRoles,
      Permission.REVOKE_ANY_SESSION,
    );

    if (!isOwner && !canRevokeAny) {
      throw new AppError("FORBIDDEN", "Você não tem permissão para revogar esta sessão");
    }

    const now = this.clock.now();
    session.revoke(now);
    await this.sessionRepository.save(session);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: input.requestingUserId,
      eventType: "SESSION_REVOKED",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { sessionId: session.id, targetUserId: session.userId },
    });
    await this.auditLogRepository.append(entry);
  }
}
