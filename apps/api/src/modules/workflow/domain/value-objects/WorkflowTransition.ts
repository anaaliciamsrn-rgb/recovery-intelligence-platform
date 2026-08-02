import type { WorkflowCondition } from "./WorkflowCondition.js";

/**
 * Uma transição possível entre dois estados de uma `WorkflowDefinition` —
 * `acao` é um rótulo textual, registrado na definição/histórico, mas
 * nenhuma integração real é disparada nesta etapa (ver ADR 0027, seção de
 * limitação de escopo). Isso mantém o motor genuinamente configurável por
 * dados, sem acoplar `workflow` a nenhum outro módulo de negócio.
 */
export interface WorkflowTransition {
  id: string;
  de: string;
  para: string;
  gatilho: string;
  condicao: WorkflowCondition | null;
  acao: string | null;
}
