export type WorkflowConditionOperator = "IGUAL" | "DIFERENTE" | "MAIOR_QUE" | "MENOR_QUE";

export const WorkflowConditionOperator = {
  IGUAL: "IGUAL",
  DIFERENTE: "DIFERENTE",
  MAIOR_QUE: "MAIOR_QUE",
  MENOR_QUE: "MENOR_QUE",
} as const satisfies Record<string, WorkflowConditionOperator>;

/** Uma condição simples e serializável — comparação de um campo do contexto do gatilho contra um valor fixo. Ver ADR 0027. */
export interface WorkflowCondition {
  campo: string;
  operador: WorkflowConditionOperator;
  valor: string | number | boolean;
}
