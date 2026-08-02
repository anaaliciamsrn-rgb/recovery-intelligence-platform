import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../application/ports/IRecommendationRule.js";

/**
 * Se aplica a risco médio (sempre) e a risco alto quando a confiança não é
 * baixa — oferecer uma saída negociada antes de (ou junto com) escalar
 * juridicamente. Ver ADR 0017.
 */
export class RecomendarParcelamentoRule implements IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null {
    const aplicavel =
      input.classe === "MEDIO_RISCO" ||
      (input.classe === "ALTO_RISCO" && input.nivelConfianca !== "BAIXA");
    if (!aplicavel) return null;

    return RecomendacaoCobranca.create({
      canal: "PARCELAMENTO",
      justificativa: `Oferecer parcelamento reduz risco de inadimplência total (classe: ${input.classe})`,
    });
  }
}
