import { AppError } from "../../../../application/errors/AppError.js";
import type { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { GerarRecomendacoesUseCase } from "../../../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import type { ImportBatchCounts } from "../../domain/entities/ImportBatch.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";

export interface ImportDashboard {
  importBatchId: string;
  quantidadeClientes: number;
  quantidadeDocumentosValidos: number;
  quantidadeDocumentosInvalidos: number;
  quantidadeDuplicada: number;
  quantidadeErros: number;
  quantidadeDossies: number;
  quantidadeResolvidas: number;
  quantidadeSemCorrespondencia: number;
  quantidadePendente: number;
  distribuicaoPorClassificacao: Record<string, number>;
  distribuicaoPorRecomendacao: Record<string, number>;
  distribuicaoPorConfianca: Record<string, number>;
  tempoImportacaoMs: number | null;
}

/**
 * Estatísticas da carteira importada. As distribuições por
 * classificação/recomendação/confiança são calculadas sob demanda, aqui,
 * chamando `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase` para cada
 * linha já resolvida (com Dossiê) — nenhum valor é pré-computado nem
 * armazenado, mesma decisão stateless das Sprints 7/8. Com dados reais de
 * hoje (nenhuma `Pessoa` cadastrada ainda), essas distribuições ficam
 * vazias — é o resultado honesto, não um placeholder. Ver ADR 0019.
 */
export class GetImportDashboardUseCase {
  constructor(
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly importRowRepository: IImportRowRepository,
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly gerarRecomendacoesUseCase: GerarRecomendacoesUseCase,
  ) {}

  async execute(importBatchId: string): Promise<ImportDashboard> {
    const batch = await this.importBatchRepository.findById(importBatchId);
    if (!batch) {
      throw new AppError("NOT_FOUND", "Lote de importação não encontrado");
    }

    const rows = await this.importRowRepository.findByImportBatchId(importBatchId);
    const contagens: ImportBatchCounts = batch.contagens;

    const resolvidas = rows.filter((row) => row.resolutionStatus === "RESOLVIDA" && row.dossieId);
    const semCorrespondencia = rows.filter((row) => row.resolutionStatus === "SEM_CORRESPONDENCIA");
    const pendentes = rows.filter((row) => row.resolutionStatus === "PENDENTE");

    const distribuicaoPorClassificacao: Record<string, number> = {};
    const distribuicaoPorRecomendacao: Record<string, number> = {};
    const distribuicaoPorConfianca: Record<string, number> = {};

    for (const row of resolvidas) {
      const dossieId = row.dossieId;
      if (!dossieId) continue;

      const classificacao = await this.classificarDossieUseCase.execute(dossieId);
      distribuicaoPorClassificacao[classificacao.classe] =
        (distribuicaoPorClassificacao[classificacao.classe] ?? 0) + 1;
      distribuicaoPorConfianca[classificacao.confianca.nivel()] =
        (distribuicaoPorConfianca[classificacao.confianca.nivel()] ?? 0) + 1;

      const recomendacoes = await this.gerarRecomendacoesUseCase.execute(dossieId);
      for (const recomendacao of recomendacoes.recomendacoes) {
        distribuicaoPorRecomendacao[recomendacao.canal] =
          (distribuicaoPorRecomendacao[recomendacao.canal] ?? 0) + 1;
      }
    }

    const tempoImportacaoMs = batch.finalizadoEm
      ? batch.finalizadoEm.getTime() - batch.iniciadoEm.getTime()
      : null;

    return {
      importBatchId,
      quantidadeClientes: batch.totalLinhas,
      quantidadeDocumentosValidos: contagens.importadas + contagens.duplicadas,
      quantidadeDocumentosInvalidos: contagens.invalidas,
      quantidadeDuplicada: contagens.duplicadas,
      quantidadeErros: contagens.erros,
      quantidadeDossies: resolvidas.length,
      quantidadeResolvidas: resolvidas.length,
      quantidadeSemCorrespondencia: semCorrespondencia.length,
      quantidadePendente: pendentes.length,
      distribuicaoPorClassificacao,
      distribuicaoPorRecomendacao,
      distribuicaoPorConfianca,
      tempoImportacaoMs,
    };
  }
}
