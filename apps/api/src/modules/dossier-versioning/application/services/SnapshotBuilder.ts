import { AppError } from "../../../../application/errors/AppError.js";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import { PromptBuilder } from "../../../prompt-builder/domain/services/PromptBuilder.js";
import type { BuildPromptUseCase } from "../../../prompt-builder/application/use-cases/BuildPromptUseCase.js";
import type { GerarRecomendacoesUseCase } from "../../../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import type {
  DossieEvidenciasSnapshot,
  EvidenciaSnapshot,
  SnapshotContent,
} from "../../domain/value-objects/SnapshotContent.js";

/**
 * Monta o `SnapshotContent` de um dossiê: reexecuta
 * `ClassificarDossieUseCase` → `GerarRecomendacoesUseCase` → `BuildPromptUseCase`
 * (composição, nenhuma lógica de negócio duplicada — mesmo padrão de
 * `GetClassificationExplanationUseCase`, ADR 0020) e congela o estado atual
 * das evidências do Dossiê. Não persiste nada — isso é responsabilidade de
 * `CreateVersionSnapshotUseCase`. Ver ADR 0022.
 */
export class SnapshotBuilder {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly gerarRecomendacoesUseCase: GerarRecomendacoesUseCase,
    private readonly buildPromptUseCase: BuildPromptUseCase,
  ) {}

  async build(dossieId: string): Promise<SnapshotContent> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const classificacao = await this.classificarDossieUseCase.execute(dossieId);
    const resultadoRecomendacao = await this.gerarRecomendacoesUseCase.execute(dossieId);
    const promptContext = await this.buildPromptUseCase.execute(dossieId);

    return {
      evidencias: this.toEvidenciasSnapshot(dossie.evidencias),
      classificacao: classificacao.classe,
      justificativaGeral: classificacao.justificativaGeral,
      fatores: classificacao.fatores.map((fator) => ({
        nome: fator.nome,
        peso: fator.peso,
        direcao: fator.direcao,
        justificativa: fator.justificativa,
      })),
      recomendacoes: resultadoRecomendacao.recomendacoes.map((recomendacao) => ({
        canal: recomendacao.canal,
        justificativa: recomendacao.justificativa,
      })),
      prompt: {
        structured: PromptBuilder.toStructuredJson(promptContext),
        texto: PromptBuilder.toTextPrompt(promptContext),
      },
      confidenceScore: classificacao.confianca.toNumber(),
      riskScore: classificacao.score.toNumber(),
    };
  }

  private toEvidenciasSnapshot(evidencias: Readonly<DossieEvidencias>): DossieEvidenciasSnapshot {
    return {
      pgfn: this.toEvidenciaSnapshot(evidencias.pgfn),
      dataJud: this.toEvidenciaSnapshot(evidencias.dataJud),
      receitaFederal: this.toEvidenciaSnapshot(evidencias.receitaFederal),
      portalTransparencia: this.toEvidenciaSnapshot(evidencias.portalTransparencia),
      cenprot: this.toEvidenciaSnapshot(evidencias.cenprot),
    };
  }

  private toEvidenciaSnapshot(evidence: Evidence<unknown>): EvidenciaSnapshot {
    switch (evidence.status) {
      case "ENCONTRADO":
        return {
          status: evidence.status,
          valor: evidence.valor,
          dataConsulta: evidence.dataConsulta.toISOString(),
          confidenceScore: evidence.confidenceScore.toNumber(),
        };
      case "NAO_ENCONTRADO":
        return {
          status: evidence.status,
          dataConsulta: evidence.dataConsulta.toISOString(),
          confidenceScore: evidence.confidenceScore.toNumber(),
        };
      case "NAO_CONSULTADO":
        return { status: evidence.status };
      case "ERRO_CONSULTA":
        return {
          status: evidence.status,
          dataConsulta: evidence.dataConsulta.toISOString(),
          motivoErro: evidence.motivoErro,
        };
    }
  }
}
