export type RuleConditionOperator = "IGUAL" | "DIFERENTE" | "MAIOR_QUE" | "MENOR_QUE";

export const RuleConditionOperator = {
  IGUAL: "IGUAL",
  DIFERENTE: "DIFERENTE",
  MAIOR_QUE: "MAIOR_QUE",
  MENOR_QUE: "MENOR_QUE",
} as const satisfies Record<string, RuleConditionOperator>;

/** Uma condição simples e serializável — comparação de um campo do contexto avaliado contra um valor fixo. Ver ADR 0030. */
export interface RuleCondition {
  campo: string;
  operador: RuleConditionOperator;
  valor: string | number | boolean;
}
