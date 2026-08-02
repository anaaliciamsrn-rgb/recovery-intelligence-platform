import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Só `create` — nunca update/delete, o agregado é append-only por design. */
  async append(entry: AuditLogEntry): Promise<void> {
    const props = entry.toProps();

    await this.prisma.auditLogEntry.create({
      data: {
        id: props.id,
        occurredAt: props.occurredAt,
        actorUserId: props.actorUserId,
        eventType: props.eventType,
        outcome: props.outcome,
        ipAddress: props.ipAddress,
        userAgent: props.userAgent,
        metadata:
          props.metadata === null ? Prisma.JsonNull : (props.metadata as Prisma.InputJsonValue),
      },
    });
  }
}
