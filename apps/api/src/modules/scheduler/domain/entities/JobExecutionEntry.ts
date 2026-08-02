import type { JobExecutionStatus } from "../value-objects/JobExecutionStatus.js";

export interface JobExecutionEntryProps {
  id: string;
  scheduledJobId: string;
  tentativa: number;
  status: JobExecutionStatus;
  erro: string | null;
  iniciadoEm: Date;
  finalizadoEm: Date;
  duracaoMs: number;
}

/** Uma execução já concluída (sucesso ou falha) de um `ScheduledJob` — histórico append-only, nunca editado. Ver ADR 0032. */
export class JobExecutionEntry {
  private constructor(private readonly props: JobExecutionEntryProps) {}

  static create(props: JobExecutionEntryProps): JobExecutionEntry {
    return new JobExecutionEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get scheduledJobId(): string {
    return this.props.scheduledJobId;
  }

  get tentativa(): number {
    return this.props.tentativa;
  }

  get status(): JobExecutionStatus {
    return this.props.status;
  }

  get erro(): string | null {
    return this.props.erro;
  }

  get iniciadoEm(): Date {
    return this.props.iniciadoEm;
  }

  get finalizadoEm(): Date {
    return this.props.finalizadoEm;
  }

  get duracaoMs(): number {
    return this.props.duracaoMs;
  }

  toProps(): Readonly<JobExecutionEntryProps> {
    return { ...this.props };
  }
}
