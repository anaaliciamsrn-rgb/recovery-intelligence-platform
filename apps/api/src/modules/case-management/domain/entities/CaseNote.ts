export interface CaseNoteProps {
  id: string;
  caseId: string;
  autorId: string | null;
  texto: string;
  createdAt: Date;
}

/** Append-only por design — sem nenhum método de mutação. */
export class CaseNote {
  private constructor(private readonly props: CaseNoteProps) {}

  static create(props: CaseNoteProps): CaseNote {
    return new CaseNote(props);
  }

  get id(): string {
    return this.props.id;
  }

  get caseId(): string {
    return this.props.caseId;
  }

  get autorId(): string | null {
    return this.props.autorId;
  }

  get texto(): string {
    return this.props.texto;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<CaseNoteProps> {
    return { ...this.props };
  }
}
