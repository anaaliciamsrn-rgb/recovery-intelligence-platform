import type {
  AuditEventPage,
  AuditEventPagination,
  IAuditEventRepository,
} from "../../domain/repositories/IAuditEventRepository.js";

export interface ListAuditEventsByEntityInput {
  entidade: string;
  entidadeId: string;
  pagination: AuditEventPagination;
}

/** `GET /audit/entity/:entity/:id`. */
export class ListAuditEventsByEntityUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(input: ListAuditEventsByEntityInput): Promise<AuditEventPage> {
    return this.auditEventRepository.findByEntity(
      input.entidade,
      input.entidadeId,
      input.pagination,
    );
  }
}
