import { DomainError } from "../../../../domain/errors/DomainError.js";
import { CasePriority } from "../value-objects/CasePriority.js";
import { CaseStatus, TRANSICOES_VALIDAS } from "../value-objects/CaseStatus.js";

export class InvalidCaseTransitionError extends DomainError {}

export interface CaseProps {
  id: string;
  dossieId: string;
  status: CaseStatus;
  ownerId: string | null;
  priority: CasePriority;
  tags: string[];
  proximaAcao: string | null;
  dataProximaAcao: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agregado raiz do ciclo de cobrança de um Dossiê. Notas (`CaseNote`) e
 * timeline (`CaseHistoryEntry`) são agregados filhos, com repositório
 * próprio — não carregados junto por padrão, mesmo padrão de
 * `ImportBatch`/`ImportRow` (ADR 0019). Ver ADR 0026.
 */
export class Case {
  private constructor(private props: CaseProps) {}

  static abrir(input: {
    id: string;
    dossieId: string;
    ownerId: string | null;
    priority: CasePriority;
    now: Date;
  }): Case {
    return new Case({
      id: input.id,
      dossieId: input.dossieId,
      status: CaseStatus.ABERTO,
      ownerId: input.ownerId,
      priority: input.priority,
      tags: [],
      proximaAcao: null,
      dataProximaAcao: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static create(props: CaseProps): Case {
    return new Case(props);
  }

  get id(): string {
    return this.props.id;
  }

  get dossieId(): string {
    return this.props.dossieId;
  }

  get status(): CaseStatus {
    return this.props.status;
  }

  get ownerId(): string | null {
    return this.props.ownerId;
  }

  get priority(): CasePriority {
    return this.props.priority;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get proximaAcao(): string | null {
    return this.props.proximaAcao;
  }

  get dataProximaAcao(): Date | null {
    return this.props.dataProximaAcao;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Valida a transição contra `TRANSICOES_VALIDAS` — nunca aceita um novo status arbitrário. */
  transicionarStatus(novoStatus: CaseStatus, now: Date): void {
    const permitidas = TRANSICOES_VALIDAS[this.props.status];
    if (!permitidas.includes(novoStatus)) {
      throw new InvalidCaseTransitionError(
        `Transição inválida: ${this.props.status} → ${novoStatus}`,
      );
    }
    this.props.status = novoStatus;
    this.props.updatedAt = now;
  }

  atualizarOwner(ownerId: string | null, now: Date): void {
    this.props.ownerId = ownerId;
    this.props.updatedAt = now;
  }

  atualizarPrioridade(priority: CasePriority, now: Date): void {
    this.props.priority = priority;
    this.props.updatedAt = now;
  }

  atualizarTags(tags: string[], now: Date): void {
    this.props.tags = [...tags];
    this.props.updatedAt = now;
  }

  definirProximaAcao(proximaAcao: string | null, dataProximaAcao: Date | null, now: Date): void {
    this.props.proximaAcao = proximaAcao;
    this.props.dataProximaAcao = dataProximaAcao;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<CaseProps> {
    return { ...this.props, tags: [...this.props.tags] };
  }
}
