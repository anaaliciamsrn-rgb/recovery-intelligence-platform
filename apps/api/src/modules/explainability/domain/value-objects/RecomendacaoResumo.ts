import type { CanalCobranca } from "../../../recommendation/domain/value-objects/CanalCobranca.js";

/**
 * Projeção plana de `RecomendacaoCobranca` (recommendation, ADR 0017) para
 * dentro deste módulo — mesma decisão de `PromptContext` (ADR 0018): a
 * explicação de classificação é uma fronteira de saída, não precisa expor
 * o tipo de domínio de outro módulo.
 */
export interface RecomendacaoResumo {
  canal: CanalCobranca;
  justificativa: string;
}
