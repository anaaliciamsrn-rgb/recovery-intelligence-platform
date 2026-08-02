import type {
  AuditEventFilter,
  AuditEventPage,
  AuditEventPagination,
  IAuditEventRepository,
} from "../../domain/repositories/IAuditEventRepository.js";

export interface ListAuditEventsInput {
  filter: AuditEventFilter;
  pagination: AuditEventPagination;
}

/** `GET /audit` — filtros por período/usuário/tipo/entidade/sucesso-falha, paginado e ordenado. */
export class ListAuditEventsUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(input: ListAuditEventsInput): Promise<AuditEventPage> {
    return this.auditEventRepository.findMany(input.filter, input.pagination);
  }
}
