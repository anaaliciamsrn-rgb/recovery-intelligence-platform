import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { AuditEventType } from "../value-objects/AuditEventType.js";
import type { AuditOutcome } from "../value-objects/AuditOutcome.js";

export class InvalidAuditEventError extends DomainError {}

export interface AuditEventProps {
  id: string;
  /** Sempre UTC — `IClock` deste módulo devolve `new Date()`, que o Postgres grava como `timestamptz`. */
  timestamp: Date;
  /** Nulo quando o usuário não pôde ser identificado na fronteira HTTP (ex.: logout — ver ADR 0021). */
  usuarioId: string | null;
  entidade: string;
  entidadeId: string | null;
  tipo: AuditEventType;
  /** Já passado por `PayloadRedactor` antes de chegar aqui — nunca contém segredo. */
  payload: unknown;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  duracaoMs: number;
  outcome: AuditOutcome;
  mensagem: string;
}

/**
 * Um evento de auditoria observado na fronteira HTTP — append-only por
 * design, mesmo padrão de `AuditLogEntry` (identity, ADR 0007/0010): de
 * propósito não existe nenhum método de mutação. Ver ADR 0021.
 */
export class AuditEvent {
  private constructor(private readonly props: AuditEventProps) {}

  static create(props: AuditEventProps): AuditEvent {
    if (props.duracaoMs < 0) {
      throw new InvalidAuditEventError(
        `Duração de operação não pode ser negativa: ${props.duracaoMs}`,
      );
    }
    return new AuditEvent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get usuarioId(): string | null {
    return this.props.usuarioId;
  }

  get entidade(): string {
    return this.props.entidade;
  }

  get entidadeId(): string | null {
    return this.props.entidadeId;
  }

  get tipo(): AuditEventType {
    return this.props.tipo;
  }

  get payload(): unknown {
    return this.props.payload;
  }

  get requestId(): string {
    return this.props.requestId;
  }

  get ip(): string | null {
    return this.props.ip;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get duracaoMs(): number {
    return this.props.duracaoMs;
  }

  get outcome(): AuditOutcome {
    return this.props.outcome;
  }

  get mensagem(): string {
    return this.props.mensagem;
  }

  toProps(): Readonly<AuditEventProps> {
    return { ...this.props };
  }
}
