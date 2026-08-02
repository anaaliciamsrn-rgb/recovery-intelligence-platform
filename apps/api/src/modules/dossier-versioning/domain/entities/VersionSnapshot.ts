import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { SnapshotContent } from "../value-objects/SnapshotContent.js";

export class InvalidVersionSnapshotError extends DomainError {}

export interface VersionSnapshotProps extends SnapshotContent {
  id: string;
  dossieId: string;
  versao: number;
  timestamp: Date;
  /** Nulo quando a mudança que gerou a versão não pôde ser atribuída a um usuário — ver ADR 0022. */
  usuarioId: string | null;
  hash: string;
}

/**
 * Uma versão completa e imutável do estado de um Dossiê num instante —
 * evidências, classificação, fatores, recomendações e prompt, todos
 * congelados no momento da criação. Append-only por design, mesmo padrão de
 * `AuditEvent`/`AuditLogEntry`: de propósito não existe nenhum método de
 * mutação, e `versao` nunca é reatribuída (ver `CreateVersionSnapshotUseCase`,
 * que sempre cria `max(versao) + 1`, nunca sobrescreve). Ver ADR 0022.
 */
export class VersionSnapshot {
  private constructor(private readonly props: VersionSnapshotProps) {}

  static create(props: VersionSnapshotProps): VersionSnapshot {
    if (props.versao < 1) {
      throw new InvalidVersionSnapshotError(`Número de versão inválido: ${props.versao}`);
    }
    return new VersionSnapshot(props);
  }

  get id(): string {
    return this.props.id;
  }

  get dossieId(): string {
    return this.props.dossieId;
  }

  get versao(): number {
    return this.props.versao;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get usuarioId(): string | null {
    return this.props.usuarioId;
  }

  get evidencias() {
    return this.props.evidencias;
  }

  get classificacao(): string {
    return this.props.classificacao;
  }

  get justificativaGeral(): string {
    return this.props.justificativaGeral;
  }

  get fatores() {
    return [...this.props.fatores];
  }

  get recomendacoes() {
    return [...this.props.recomendacoes];
  }

  get prompt() {
    return this.props.prompt;
  }

  get confidenceScore(): number {
    return this.props.confidenceScore;
  }

  get riskScore(): number {
    return this.props.riskScore;
  }

  get hash(): string {
    return this.props.hash;
  }

  /** O conteúdo hasheável — usado por `SnapshotHashService`/`VersionDiffService` sem expor `id`/`versao`/`timestamp`/`usuarioId`/`hash`. */
  get content(): SnapshotContent {
    return {
      evidencias: this.props.evidencias,
      classificacao: this.props.classificacao,
      justificativaGeral: this.props.justificativaGeral,
      fatores: [...this.props.fatores],
      recomendacoes: [...this.props.recomendacoes],
      prompt: this.props.prompt,
      confidenceScore: this.props.confidenceScore,
      riskScore: this.props.riskScore,
    };
  }

  toProps(): Readonly<VersionSnapshotProps> {
    return { ...this.props };
  }
}
