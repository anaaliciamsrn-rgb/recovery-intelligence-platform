import type { RuleDefinition } from "../entities/RuleDefinition.js";
import type { RuleCondition } from "../value-objects/RuleCondition.js";

function avaliarCondicao(condicao: RuleCondition, contexto: Record<string, unknown>): boolean {
  const valorReal = contexto[condicao.campo];
  switch (condicao.operador) {
    case "IGUAL":
      return valorReal === condicao.valor;
    case "DIFERENTE":
      return valorReal !== condicao.valor;
    case "MAIOR_QUE":
      return (
        typeof valorReal === "number" &&
        typeof condicao.valor === "number" &&
        valorReal > condicao.valor
      );
    case "MENOR_QUE":
      return (
        typeof valorReal === "number" &&
        typeof condicao.valor === "number" &&
        valorReal < condicao.valor
      );
  }
}

/** Uma regra que casou seu contexto, com o motivo (condições satisfeitas) preservado — decisão explicável, não uma caixa-preta. */
export interface RuleMatch {
  regra: RuleDefinition;
  condicoesSatisfeitas: RuleCondition[];
}

export interface RuleEvaluationResult {
  regrasCasadas: RuleMatch[];
  pontuacaoTotal: number;
}

/**
 * Motor de avaliação de regras — puro, sem I/O. Todas as condições de uma
 * regra precisam ser satisfeitas (semântica E) para a regra casar. Regras
 * casadas vêm ordenadas por prioridade desc, depois peso desc — a mesma
 * regra nunca decide sozinha "o que fazer", só é candidata; quem decide a
 * ação final é o chamador (ver ADR 0030 — este motor não substitui
 * retroativamente o motor de classificação hardcoded já aprovado).
 */
export class RuleEvaluator {
  static avaliar(
    regras: RuleDefinition[],
    contexto: Record<string, unknown>,
  ): RuleEvaluationResult {
    const regrasCasadas: RuleMatch[] = regras
      .filter((regra) => regra.ativo)
      .filter((regra) => regra.condicoes.every((condicao) => avaliarCondicao(condicao, contexto)))
      .map((regra) => ({ regra, condicoesSatisfeitas: regra.condicoes }))
      .sort((a, b) => b.regra.prioridade - a.regra.prioridade || b.regra.peso - a.regra.peso);

    const pontuacaoTotal = regrasCasadas.reduce((total, match) => total + match.regra.peso, 0);

    return { regrasCasadas, pontuacaoTotal };
  }
}
