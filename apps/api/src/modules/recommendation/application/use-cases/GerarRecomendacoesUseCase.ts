import type { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type { IRecommendationRule, RecommendationRuleInput } from "../ports/IRecommendationRule.js";

export interface GerarRecomendacoesOutput {
  dossieId: string;
  classificacao: {
    classe: RecommendationRuleInput["classe"];
    score: number;
    confianca: number;
    nivelConfianca: RecommendationRuleInput["nivelConfianca"];
  };
  recomendacoes: RecomendacaoCobranca[];
}

const JUSTIFICATIVA_FALLBACK =
  "Nenhuma regra específica se aplicou a esta combinação de risco e confiança — cobrança amigável recomendada como abordagem padrão segura.";

/**
 * Orquestra: classifica o dossiê (reaproveita `ClassificarDossieUseCase` de
 * `classification`, mesma instância construída no container deste módulo —
 * ver ADR 0017) e roda o motor de recomendação sobre o resultado. Se nenhuma
 * regra se aplicar, cai num fallback explícito (cobrança amigável) — nunca
 * devolve uma lista vazia sem explicação.
 */
export class GerarRecomendacoesUseCase {
  constructor(
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly rules: IRecommendationRule[],
  ) {}

  async execute(dossieId: string): Promise<GerarRecomendacoesOutput> {
    const classificacao = await this.classificarDossieUseCase.execute(dossieId);

    const input: RecommendationRuleInput = {
      classe: classificacao.classe,
      score: classificacao.score.toNumber(),
      confianca: classificacao.confianca.toNumber(),
      nivelConfianca: classificacao.confianca.nivel(),
    };

    const recomendacoes = this.rules
      .map((rule) => rule.avaliar(input))
      .filter((recomendacao): recomendacao is RecomendacaoCobranca => recomendacao !== null);

    return {
      dossieId,
      classificacao: input,
      recomendacoes:
        recomendacoes.length > 0
          ? recomendacoes
          : [
              RecomendacaoCobranca.create({
                canal: "COBRANCA_AMIGAVEL",
                justificativa: JUSTIFICATIVA_FALLBACK,
              }),
            ],
    };
  }
}
