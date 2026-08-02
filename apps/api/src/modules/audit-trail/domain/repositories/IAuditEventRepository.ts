import type { AuditEvent } from "../entities/AuditEvent.js";
import type { AuditEventType } from "../value-objects/AuditEventType.js";
import type { AuditOutcome } from "../value-objects/AuditOutcome.js";

export interface AuditEventFilter {
  desde?: Date;
  ate?: Date;
  usuarioId?: string;
  tipo?: AuditEventType;
  entidade?: string;
  outcome?: AuditOutcome;
}

export type AuditEventSortField = "timestamp" | "duracaoMs";
export type SortOrder = "asc" | "desc";

export interface AuditEventPagination {
  page: number;
  pageSize: number;
  sortBy: AuditEventSortField;
  sortOrder: SortOrder;
}

export interface AuditEventPage {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

/** Append-only pelo lado de escrita — só `save` (nunca update/delete), mesmo espírito de `AuditLogEntry.append` (identity). */
export interface IAuditEventRepository {
  save(event: AuditEvent): Promise<void>;
  findById(id: string): Promise<AuditEvent | null>;
  findMany(filter: AuditEventFilter, pagination: AuditEventPagination): Promise<AuditEventPage>;
  findByEntity(
    entidade: string,
    entidadeId: string,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage>;
  findByUser(usuarioId: string, pagination: AuditEventPagination): Promise<AuditEventPage>;
  findByRequestId(requestId: string): Promise<AuditEvent[]>;
}
