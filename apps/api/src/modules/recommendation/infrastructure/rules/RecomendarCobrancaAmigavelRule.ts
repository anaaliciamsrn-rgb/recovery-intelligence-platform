import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../application/ports/IRecommendationRule.js";

export class RecomendarCobrancaAmigavelRule implements IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null {
    if (input.classe !== "BAIXO_RISCO") return null;

    return RecomendacaoCobranca.create({
      canal: "COBRANCA_AMIGAVEL",
      justificativa:
        "Risco baixo não justifica escalonamento — abordagem amigável preserva o relacionamento",
    });
  }
}
