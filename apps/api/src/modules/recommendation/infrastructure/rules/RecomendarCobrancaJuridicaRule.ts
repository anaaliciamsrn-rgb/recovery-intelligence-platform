import { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../application/ports/IRecommendationRule.js";

/**
 * Só recomenda escalonamento jurídico quando o risco é alto E a confiança
 * não é baixa — uma ação drástica não deveria ser recomendada com base em
 * dados incompletos/não confiáveis, mesmo que o score aponte risco alto.
 * Ver ADR 0017.
 */
export class RecomendarCobrancaJuridicaRule implements IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null {
    if (input.classe !== "ALTO_RISCO" || input.nivelConfianca === "BAIXA") return null;

    return RecomendacaoCobranca.create({
      canal: "COBRANCA_JURIDICA",
      justificativa: `Risco alto com confiança ${input.nivelConfianca.toLowerCase()} justifica escalonamento jurídico`,
    });
  }
}
