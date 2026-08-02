import {
  Prisma,
  type AuditEvent as PrismaAuditEventRecord,
  type PrismaClient,
} from "@prisma/client";
import { AuditEvent } from "../../domain/entities/AuditEvent.js";
import type {
  AuditEventFilter,
  AuditEventPage,
  AuditEventPagination,
  IAuditEventRepository,
} from "../../domain/repositories/IAuditEventRepository.js";
import type { AuditEventType } from "../../domain/value-objects/AuditEventType.js";
import type { AuditOutcome } from "../../domain/value-objects/AuditOutcome.js";

export class PrismaAuditEventRepository implements IAuditEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Só `create` — nunca update/delete, o agregado é append-only por design. */
  async save(event: AuditEvent): Promise<void> {
    const props = event.toProps();

    await this.prisma.auditEvent.create({
      data: {
        id: props.id,
        timestamp: props.timestamp,
        usuarioId: props.usuarioId,
        entidade: props.entidade,
        entidadeId: props.entidadeId,
        tipo: props.tipo,
        payload: props.payload as Prisma.InputJsonValue,
        requestId: props.requestId,
        ip: props.ip,
        userAgent: props.userAgent,
        duracaoMs: props.duracaoMs,
        outcome: props.outcome,
        mensagem: props.mensagem,
      },
    });
  }

  async findById(id: string): Promise<AuditEvent | null> {
    const record = await this.prisma.auditEvent.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findMany(
    filter: AuditEventFilter,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage> {
    return this.paginate(this.buildWhere(filter), pagination);
  }

  async findByEntity(
    entidade: string,
    entidadeId: string,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage> {
    return this.paginate({ entidade, entidadeId }, pagination);
  }

  async findByUser(usuarioId: string, pagination: AuditEventPagination): Promise<AuditEventPage> {
    return this.paginate({ usuarioId }, pagination);
  }

  async findByRequestId(requestId: string): Promise<AuditEvent[]> {
    const records = await this.prisma.auditEvent.findMany({
      where: { requestId },
      orderBy: { timestamp: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private async paginate(
    where: Prisma.AuditEventWhereInput,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage> {
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  private buildWhere(filter: AuditEventFilter): Prisma.AuditEventWhereInput {
    return {
      ...(filter.desde || filter.ate
        ? {
            timestamp: {
              ...(filter.desde ? { gte: filter.desde } : {}),
              ...(filter.ate ? { lte: filter.ate } : {}),
            },
          }
        : {}),
      ...(filter.usuarioId ? { usuarioId: filter.usuarioId } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.entidade ? { entidade: filter.entidade } : {}),
      ...(filter.outcome ? { outcome: filter.outcome } : {}),
    };
  }

  private toDomain(record: PrismaAuditEventRecord): AuditEvent {
    return AuditEvent.create({
      id: record.id,
      timestamp: record.timestamp,
      usuarioId: record.usuarioId,
      entidade: record.entidade,
      entidadeId: record.entidadeId,
      tipo: record.tipo as AuditEventType,
      payload: record.payload,
      requestId: record.requestId,
      ip: record.ip,
      userAgent: record.userAgent,
      duracaoMs: record.duracaoMs,
      outcome: record.outcome as AuditOutcome,
      mensagem: record.mensagem,
    });
  }
}
