import { AuditEvent } from "../../domain/entities/AuditEvent.js";
import type { IAuditEventRepository } from "../../domain/repositories/IAuditEventRepository.js";
import type { AuditEventType } from "../../domain/value-objects/AuditEventType.js";
import type { AuditOutcome } from "../../domain/value-objects/AuditOutcome.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RecordAuditEventInput {
  usuarioId: string | null;
  entidade: string;
  entidadeId: string | null;
  tipo: AuditEventType;
  payload: unknown;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  duracaoMs: number;
  outcome: AuditOutcome;
  mensagem: string;
}

/**
 * Persiste um evento de auditoria já observado — não decide o que é
 * relevante nem como extrair os campos (isso é do middleware,
 * `presentation/middlewares/auditTrail.middleware.ts`). Mantém a camada de
 * aplicação fina, mesmo padrão de `RecordAuditEventUseCase`-like use cases
 * já vistos em outros módulos (ex.: `ImportPgfnSpreadsheetUseCase`). Ver ADR 0021.
 */
export class RecordAuditEventUseCase {
  constructor(
    private readonly auditEventRepository: IAuditEventRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: RecordAuditEventInput): Promise<void> {
    const event = AuditEvent.create({
      id: this.idGenerator.generateId(),
      timestamp: this.clock.now(),
      ...input,
    });

    await this.auditEventRepository.save(event);
  }
}
