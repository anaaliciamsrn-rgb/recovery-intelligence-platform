import { DomainError } from "../../../../domain/errors/DomainError.js";
import { ScheduledJobStatus } from "../value-objects/ScheduledJobStatus.js";

export class InvalidScheduledJobError extends DomainError {}
export class InvalidJobTransitionError extends DomainError {}

export interface ScheduledJobProps {
  id: string;
  nome: string;
  tipo: string;
  payload: Record<string, unknown>;
  status: ScheduledJobStatus;
  agendadoPara: Date;
  tentativas: number;
  maxTentativas: number;
  ultimoErro: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Um job interno agendado — `tipo` identifica qual handler processa o
 * `payload` (resolvido em runtime via `IJobHandlerRegistry`, ver ADR 0032).
 * `tentativas`/`maxTentativas` implementam retry com fila-morta (`MORTO`):
 * esgotadas as tentativas, o job para de ser reprocessado automaticamente,
 * mas nunca é apagado — fica visível para investigação manual.
 */
export class ScheduledJob {
  private constructor(private props: ScheduledJobProps) {}

  static agendar(props: ScheduledJobProps): ScheduledJob {
    if (props.nome.trim().length === 0) {
      throw new InvalidScheduledJobError("Nome do job não pode ser vazio");
    }
    if (props.tipo.trim().length === 0) {
      throw new InvalidScheduledJobError("Tipo do job não pode ser vazio");
    }
    if (!Number.isInteger(props.maxTentativas) || props.maxTentativas < 1) {
      throw new InvalidScheduledJobError("maxTentativas precisa ser um inteiro maior ou igual a 1");
    }
    return new ScheduledJob(props);
  }

  get id(): string {
    return this.props.id;
  }

  get nome(): string {
    return this.props.nome;
  }

  get tipo(): string {
    return this.props.tipo;
  }

  get payload(): Record<string, unknown> {
    return { ...this.props.payload };
  }

  get status(): ScheduledJobStatus {
    return this.props.status;
  }

  get agendadoPara(): Date {
    return this.props.agendadoPara;
  }

  get tentativas(): number {
    return this.props.tentativas;
  }

  get maxTentativas(): number {
    return this.props.maxTentativas;
  }

  get ultimoErro(): string | null {
    return this.props.ultimoErro;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  iniciarExecucao(now: Date): void {
    if (this.props.status !== ScheduledJobStatus.PENDENTE) {
      throw new InvalidJobTransitionError(
        `Só é possível iniciar execução de um job PENDENTE (atual: ${this.props.status})`,
      );
    }
    this.props.status = ScheduledJobStatus.EXECUTANDO;
    this.props.updatedAt = now;
  }

  concluir(now: Date): void {
    if (this.props.status !== ScheduledJobStatus.EXECUTANDO) {
      throw new InvalidJobTransitionError(
        `Só é possível concluir um job EXECUTANDO (atual: ${this.props.status})`,
      );
    }
    this.props.status = ScheduledJobStatus.CONCLUIDO;
    this.props.ultimoErro = null;
    this.props.updatedAt = now;
  }

  /** `proximaTentativa === null` significa fila-morta: `maxTentativas` foi esgotado. */
  falhar(erro: string, proximaTentativa: Date | null, now: Date): void {
    if (this.props.status !== ScheduledJobStatus.EXECUTANDO) {
      throw new InvalidJobTransitionError(
        `Só é possível registrar falha de um job EXECUTANDO (atual: ${this.props.status})`,
      );
    }
    this.props.tentativas += 1;
    this.props.ultimoErro = erro;
    this.props.updatedAt = now;

    if (proximaTentativa) {
      this.props.status = ScheduledJobStatus.PENDENTE;
      this.props.agendadoPara = proximaTentativa;
    } else {
      this.props.status = ScheduledJobStatus.MORTO;
    }
  }

  toProps(): Readonly<ScheduledJobProps> {
    return { ...this.props, payload: { ...this.props.payload } };
  }
}
