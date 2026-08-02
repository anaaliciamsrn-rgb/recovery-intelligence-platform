import { ImportResolutionStatus } from "../value-objects/ImportResolutionStatus.js";
import type { ImportRowStatus } from "../value-objects/ImportRowStatus.js";

export interface ImportRowProps {
  id: string;
  importBatchId: string;
  numeroLinha: number;
  status: ImportRowStatus;
  resolutionStatus: ImportResolutionStatus;
  pessoaId: string | null;
  dossieId: string | null;
  documentoMascarado: string | null;
  nome: string | null;
  nomeFantasia: string | null;
  valorTotal: number | null;
  valorDividaSelecionada: number | null;
  naturezaDivida: string | null;
  motivo: string | null;
  createdAt: Date;
}

/**
 * Uma linha do arquivo de origem, já com o resultado da ingestão. `status`
 * responde "a linha foi processada corretamente?"; `resolutionStatus`
 * responde separadamente "sabemos a quem ela pertence?" — só linhas
 * `IMPORTADA` chegam a ter uma tentativa de resolução; as demais (ignorada,
 * inválida, duplicada, erro) nunca avançam para lá. Ver ADR 0019.
 */
export class ImportRow {
  private constructor(private props: ImportRowProps) {}

  static create(props: ImportRowProps): ImportRow {
    return new ImportRow(props);
  }

  get id(): string {
    return this.props.id;
  }

  get importBatchId(): string {
    return this.props.importBatchId;
  }

  get numeroLinha(): number {
    return this.props.numeroLinha;
  }

  get status(): ImportRowStatus {
    return this.props.status;
  }

  get resolutionStatus(): ImportResolutionStatus {
    return this.props.resolutionStatus;
  }

  get pessoaId(): string | null {
    return this.props.pessoaId;
  }

  get dossieId(): string | null {
    return this.props.dossieId;
  }

  get documentoMascarado(): string | null {
    return this.props.documentoMascarado;
  }

  get nome(): string | null {
    return this.props.nome;
  }

  get nomeFantasia(): string | null {
    return this.props.nomeFantasia;
  }

  get valorTotal(): number | null {
    return this.props.valorTotal;
  }

  get valorDividaSelecionada(): number | null {
    return this.props.valorDividaSelecionada;
  }

  get naturezaDivida(): string | null {
    return this.props.naturezaDivida;
  }

  get motivo(): string | null {
    return this.props.motivo;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  marcarResolvida(pessoaId: string, dossieId: string): void {
    this.props.resolutionStatus = ImportResolutionStatus.RESOLVIDA;
    this.props.pessoaId = pessoaId;
    this.props.dossieId = dossieId;
  }

  marcarSemCorrespondencia(): void {
    this.props.resolutionStatus = ImportResolutionStatus.SEM_CORRESPONDENCIA;
    this.props.pessoaId = null;
    this.props.dossieId = null;
  }

  toProps(): Readonly<ImportRowProps> {
    return { ...this.props };
  }
}
