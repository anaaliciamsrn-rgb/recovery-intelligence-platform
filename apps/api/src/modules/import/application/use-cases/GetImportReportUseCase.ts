import { AppError } from "../../../../application/errors/AppError.js";
import type { ImportRow } from "../../domain/entities/ImportRow.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";

export interface ImportReportRow {
  numeroLinha: number;
  nome: string | null;
  status: string;
  resolutionStatus: string;
  motivo: string | null;
}

export interface ImportReport {
  importBatchId: string;
  nomeArquivo: string;
  fonte: string;
  iniciadoEm: Date;
  finalizadoEm: Date | null;
  clientesImportados: ImportReportRow[];
  clientesRejeitados: ImportReportRow[];
  resumoExecutivo: string;
}

/**
 * Relatório final de um lote — separa explicitamente "importados"
 * (status IMPORTADA ou DUPLICADA, que ainda assim representam uma linha
 * reconhecida) de "rejeitados" (INVALIDA/IGNORADA/ERRO), cada um com o
 * motivo. `resumoExecutivo` é texto puro, no mesmo espírito do
 * `PromptBuilder` (ADR 0018) — uma segunda representação da mesma fonte de
 * dados, não uma nova fonte de verdade. Ver ADR 0019.
 */
export class GetImportReportUseCase {
  constructor(
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly importRowRepository: IImportRowRepository,
  ) {}

  async execute(importBatchId: string): Promise<ImportReport> {
    const batch = await this.importBatchRepository.findById(importBatchId);
    if (!batch) {
      throw new AppError("NOT_FOUND", "Lote de importação não encontrado");
    }

    const rows = await this.importRowRepository.findByImportBatchId(importBatchId);
    const clientesImportados = rows.filter(
      (row) => row.status === "IMPORTADA" || row.status === "DUPLICADA",
    );
    const clientesRejeitados = rows.filter(
      (row) => row.status === "INVALIDA" || row.status === "IGNORADA" || row.status === "ERRO",
    );

    const contagens = batch.contagens;
    const resumoExecutivo =
      `Lote "${batch.nomeArquivo}" (fonte: ${batch.fonte}): ${batch.totalLinhas} linhas processadas. ` +
      `${contagens.importadas} importadas, ${contagens.duplicadas} duplicadas, ${contagens.invalidas} inválidas, ` +
      `${contagens.ignoradas} ignoradas, ${contagens.erros} com erro. ` +
      `Das linhas importadas, a resolução de identidade encontrou correspondência confirmada em ` +
      `${rows.filter((r) => r.resolutionStatus === "RESOLVIDA").length} caso(s); ` +
      `${rows.filter((r) => r.resolutionStatus === "SEM_CORRESPONDENCIA").length} ficaram sem correspondência; ` +
      `${rows.filter((r) => r.resolutionStatus === "PENDENTE").length} ainda não tiveram a identidade resolvida.`;

    return {
      importBatchId,
      nomeArquivo: batch.nomeArquivo,
      fonte: batch.fonte,
      iniciadoEm: batch.iniciadoEm,
      finalizadoEm: batch.finalizadoEm,
      clientesImportados: clientesImportados.map(this.toReportRow),
      clientesRejeitados: clientesRejeitados.map(this.toReportRow),
      resumoExecutivo,
    };
  }

  private toReportRow(row: ImportRow): ImportReportRow {
    return {
      numeroLinha: row.numeroLinha,
      nome: row.nome,
      status: row.status,
      resolutionStatus: row.resolutionStatus,
      motivo: row.motivo,
    };
  }
}
