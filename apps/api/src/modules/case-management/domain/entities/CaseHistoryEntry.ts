export type CaseHistoryEventType =
  | "CASO_CRIADO"
  | "STATUS_ALTERADO"
  | "OWNER_ALTERADO"
  | "PRIORIDADE_ALTERADA"
  | "TAGS_ALTERADAS"
  | "PROXIMA_ACAO_DEFINIDA"
  | "NOTA_ADICIONADA";

export interface CaseHistoryEntryProps {
  id: string;
  caseId: string;
  tipo: CaseHistoryEventType;
  descricao: string;
  autorId: string | null;
  timestamp: Date;
}

/** Timeline append-only de um Case — mesmo espírito de `AuditLogEntry`/`AuditEvent`. */
export class CaseHistoryEntry {
  private constructor(private readonly props: CaseHistoryEntryProps) {}

  static create(props: CaseHistoryEntryProps): CaseHistoryEntry {
    return new CaseHistoryEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get caseId(): string {
    return this.props.caseId;
  }

  get tipo(): CaseHistoryEventType {
    return this.props.tipo;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get autorId(): string | null {
    return this.props.autorId;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  toProps(): Readonly<CaseHistoryEntryProps> {
    return { ...this.props };
  }
}
