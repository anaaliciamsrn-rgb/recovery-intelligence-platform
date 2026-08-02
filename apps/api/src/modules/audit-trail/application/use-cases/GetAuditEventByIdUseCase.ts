import { AppError } from "../../../../application/errors/AppError.js";
import type { AuditEvent } from "../../domain/entities/AuditEvent.js";
import type { IAuditEventRepository } from "../../domain/repositories/IAuditEventRepository.js";

/** `GET /audit/:id`. */
export class GetAuditEventByIdUseCase {
  constructor(private readonly auditEventRepository: IAuditEventRepository) {}

  async execute(id: string): Promise<AuditEvent> {
    const event = await this.auditEventRepository.findById(id);
    if (!event) {
      throw new AppError("NOT_FOUND", "Evento de auditoria não encontrado");
    }
    return event;
  }
}
