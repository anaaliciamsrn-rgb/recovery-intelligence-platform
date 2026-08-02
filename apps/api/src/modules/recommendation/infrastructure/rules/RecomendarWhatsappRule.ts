import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../application/ports/IRecommendationRule.js";

export class RecomendarWhatsappRule implements IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null {
    if (input.classe !== "BAIXO_RISCO") return null;

    return RecomendacaoCobranca.create({
      canal: "WHATSAPP",
      justificativa:
        "Risco baixo favorece um primeiro contato de baixo custo e baixo atrito via WhatsApp",
    });
  }
}
