import { AppError } from "../../../../application/errors/AppError.js";
import type { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { BuildPromptUseCase } from "../../../prompt-builder/application/use-cases/BuildPromptUseCase.js";
import type { GerarRecomendacoesUseCase } from "../../../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { ClassificationExplanation } from "../../domain/entities/ClassificationExplanation.js";
import { DecisionTimelineBuilder } from "../../domain/services/DecisionTimelineBuilder.js";
import { FatorSourceMapper } from "../../domain/services/FatorSourceMapper.js";
import type { IClock } from "../ports/IClock.js";

/**
 * Orquestra a explicação completa de uma classificação: reexecuta
 * `ClassificarDossieUseCase` → `GerarRecomendacoesUseCase` → `BuildPromptUseCase`
 * (composição, nenhuma lógica de negócio duplicada — mesmo padrão de
 * `BuildPromptUseCase`, ADR 0018), liga cada fator à sua evidência real via
 * `FatorSourceMapper`, e monta a timeline via `DecisionTimelineBuilder`. Os
 * timestamps de classificação/recomendação/prompt são o instante real desta
 * execução — este pipeline é stateless e recalculado a cada chamada (ver
 * ADR 0016/0017/0018), então "agora" É quando essas etapas de fato
 * aconteceram, não um valor inferido. Ver ADR 0020.
 */
export class GetClassificationExplanationUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly gerarRecomendacoesUseCase: GerarRecomendacoesUseCase,
    private readonly buildPromptUseCase: BuildPromptUseCase,
    private readonly clock: IClock,
  ) {}

  async execute(dossieId: string): Promise<ClassificationExplanation> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const classificacao = await this.classificarDossieUseCase.execute(dossieId);
    const classificacaoExecutadaEm = this.clock.now();

    const resultadoRecomendacao = await this.gerarRecomendacoesUseCase.execute(dossieId);
    const recomendacaoGeradaEm = this.clock.now();

    await this.buildPromptUseCase.execute(dossieId);
    const promptCriadoEm = this.clock.now();

    const fatoresExplicados = FatorSourceMapper.map(classificacao.fatores, dossie.evidencias);

    const timeline = DecisionTimelineBuilder.build({
      dossieCreatedAt: dossie.createdAt,
      dossieUpdatedAt: dossie.updatedAt,
      evidencias: dossie.evidencias,
      classificacaoExecutadaEm,
      recomendacaoGeradaEm,
      promptCriadoEm,
    });

    return ClassificationExplanation.create({
      dossieId,
      geradoEm: this.clock.now(),
      score: classificacao.score,
      classe: classificacao.classe,
      confianca: classificacao.confianca,
      justificativaGeral: classificacao.justificativaGeral,
      fatores: fatoresExplicados,
      recomendacoes: resultadoRecomendacao.recomendacoes.map((recomendacao) => ({
        canal: recomendacao.canal,
        justificativa: recomendacao.justificativa,
      })),
      timeline,
    });
  }
}
