import type { RecomendacaoCobranca } from "../../domain/value-objects/RecomendacaoCobranca.js";

export interface RecommendationRuleInput {
  classe: "BAIXO_RISCO" | "MEDIO_RISCO" | "ALTO_RISCO";
  score: number;
  confianca: number;
  nivelConfianca: "ALTA" | "MEDIA" | "BAIXA";
}

/**
 * Contrato de uma regra do motor de recomendação — mesma filosofia do
 * `IClassificationRule` (ADR 0016): `avaliar` devolve `null` quando a regra
 * não se aplica à classificação de risco recebida, nunca uma recomendação
 * "vazia". Cada regra mapeia para exatamente um canal de cobrança. Ver ADR
 * 0017.
 */
export interface IRecommendationRule {
  avaliar(input: RecommendationRuleInput): RecomendacaoCobranca | null;
}
