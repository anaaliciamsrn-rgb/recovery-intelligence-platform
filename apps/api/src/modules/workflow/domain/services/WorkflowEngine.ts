import type { WorkflowDefinition } from "../entities/WorkflowDefinition.js";
import type { WorkflowCondition } from "../value-objects/WorkflowCondition.js";
import type { WorkflowTransition } from "../value-objects/WorkflowTransition.js";

function avaliarCondicao(condicao: WorkflowCondition, contexto: Record<string, unknown>): boolean {
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

/**
 * Encontra a transição aplicável para um estado atual + gatilho — puro,
 * sem I/O. Se mais de uma transição casar o mesmo estado+gatilho, a
 * primeira cuja condição seja satisfeita (ou sem condição) vence — a ordem
 * de definição na `WorkflowDefinition` funciona como prioridade implícita.
 * Ver ADR 0027.
 */
export class WorkflowEngine {
  static encontrarTransicao(
    definicao: WorkflowDefinition,
    estadoAtual: string,
    gatilho: string,
    contexto: Record<string, unknown> = {},
  ): WorkflowTransition | null {
    const candidatas = definicao.transicoes.filter(
      (transicao) => transicao.de === estadoAtual && transicao.gatilho === gatilho,
    );

    for (const transicao of candidatas) {
      if (!transicao.condicao || avaliarCondicao(transicao.condicao, contexto)) {
        return transicao;
      }
    }

    return null;
  }
}
