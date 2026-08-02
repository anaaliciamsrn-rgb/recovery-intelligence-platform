import type {
  AuditEventPage,
  AuditEventPagination,
  IAuditEventRepository,
} from "../../domain/repositories/IAuditEventRepository.js";

export interface ListAuditEventsByUserInput {
  usuarioId: string;
  pagination: AuditEventPagination;
}

/** `GET /audit/user/:userId`. */
export class ListAuditEventsByUserUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(input: ListAuditEventsByUserInput): Promise<AuditEventPage> {
    return this.auditEventRepository.findByUser(input.usuarioId, input.pagination);
  }
}
