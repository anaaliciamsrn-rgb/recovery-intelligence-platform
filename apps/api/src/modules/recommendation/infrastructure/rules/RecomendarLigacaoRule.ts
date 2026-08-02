import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../application/ports/IRecommendationRule.js";

export class RecomendarLigacaoRule implements IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null {
    if (input.classe !== "MEDIO_RISCO") return null;

    return RecomendacaoCobranca.create({
      canal: "LIGACAO",
      justificativa:
        "Risco médio justifica contato direto por ligação, mais eficaz que mensagem assíncrona",
    });
  }
}
