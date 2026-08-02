import type { AuditEvent } from "../../domain/entities/AuditEvent.js";
import type { IAuditEventRepository } from "../../domain/repositories/IAuditEventRepository.js";

/**
 * `GET /audit/request/:requestId`. Devolve uma lista (não paginada) — hoje,
 * no máximo um evento por `requestId` (o middleware grava um único evento
 * por requisição observada), mas a forma de lista fica coerente com os
 * demais endpoints e não fecha a porta para múltiplos eventos por request
 * no futuro. Ver ADR 0021.
 */
export class ListAuditEventsByRequestIdUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(requestId: string): Promise<AuditEvent[]> {
    return this.auditEventRepository.findByRequestId(requestId);
  }
}
