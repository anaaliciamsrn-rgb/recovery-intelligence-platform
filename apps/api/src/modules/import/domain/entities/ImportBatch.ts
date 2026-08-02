import { DomainError } from "../../../../domain/errors/DomainError.js";
import { ImportBatchStatus } from "../value-objects/ImportBatchStatus.js";

export class InvalidImportBatchTransitionError extends DomainError {}

export interface ImportBatchCounts {
  importadas: number;
  ignoradas: number;
  invalidas: number;
  duplicadas: number;
  erros: number;
}

export interface ImportBatchProps {
  id: string;
  fonte: string;
  nomeArquivo: string;
  iniciadoEm: Date;
  finalizadoEm: Date | null;
  totalLinhas: number;
  contagens: ImportBatchCounts;
  status: ImportBatchStatus;
  revertidoEm: Date | null;
  motivoReversao: string | null;
}

/**
 * Agregado raiz de uma importação (um upload = um lote). Guarda só os
 * contadores agregados — o detalhe de cada linha vive em `ImportRow`,
 * agregado filho com repositório próprio (não carregado junto por padrão;
 * mesma decisão de `Session`/`RefreshToken` em identity — lifecycle e
 * volume de escrita muito diferentes para valer travar o agregado pai a
 * cada linha). Ver ADR 0019.
 */
export class ImportBatch {
  private constructor(private props: ImportBatchProps) {}

  static iniciar(input: {
    id: string;
    fonte: string;
    nomeArquivo: string;
    totalLinhas: number;
    now: Date;
  }): ImportBatch {
    return new ImportBatch({
      id: input.id,
      fonte: input.fonte,
      nomeArquivo: input.nomeArquivo,
      iniciadoEm: input.now,
      finalizadoEm: null,
      totalLinhas: input.totalLinhas,
      contagens: { importadas: 0, ignoradas: 0, invalidas: 0, duplicadas: 0, erros: 0 },
      status: ImportBatchStatus.CONCLUIDO,
      revertidoEm: null,
      motivoReversao: null,
    });
  }

  static create(props: ImportBatchProps): ImportBatch {
    return new ImportBatch(props);
  }

  get id(): string {
    return this.props.id;
  }

  get fonte(): string {
    return this.props.fonte;
  }

  get nomeArquivo(): string {
    return this.props.nomeArquivo;
  }

  get iniciadoEm(): Date {
    return this.props.iniciadoEm;
  }

  get finalizadoEm(): Date | null {
    return this.props.finalizadoEm;
  }

  get totalLinhas(): number {
    return this.props.totalLinhas;
  }

  get contagens(): Readonly<ImportBatchCounts> {
    return { ...this.props.contagens };
  }

  get status(): ImportBatchStatus {
    return this.props.status;
  }

  get revertidoEm(): Date | null {
    return this.props.revertidoEm;
  }

  get motivoReversao(): string | null {
    return this.props.motivoReversao;
  }

  registrarContagem(status: keyof ImportBatchCounts): void {
    this.props.contagens[status] += 1;
  }

  finalizar(now: Date): void {
    this.props.finalizadoEm = now;
  }

  /**
   * Reversão lógica: nunca apaga `ImportRow` (auditabilidade total, ver
   * ADR 0034) — só sinaliza que o lote deixou de ser válido
   * operacionalmente. Não recalcula deduplicação de lotes futuros (ver
   * limitação documentada na ADR 0034).
   */
  reverter(motivo: string, now: Date): void {
    if (this.props.status === ImportBatchStatus.REVERTIDO) {
      throw new InvalidImportBatchTransitionError("Lote já foi revertido anteriormente");
    }
    this.props.status = ImportBatchStatus.REVERTIDO;
    this.props.revertidoEm = now;
    this.props.motivoReversao = motivo;
  }

  toProps(): Readonly<ImportBatchProps> {
    return { ...this.props, contagens: { ...this.props.contagens } };
  }
}
