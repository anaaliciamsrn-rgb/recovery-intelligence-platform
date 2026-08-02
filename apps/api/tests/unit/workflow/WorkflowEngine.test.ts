import { WorkflowDefinition } from "../../../src/modules/workflow/domain/entities/WorkflowDefinition.js";
import { WorkflowEngine } from "../../../src/modules/workflow/domain/services/WorkflowEngine.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildDefinicao() {
  return WorkflowDefinition.create({
    id: "wf-1",
    nome: "Cobrança padrão",
    descricao: null,
    estados: ["NOVO", "EM_CONTATO", "NEGOCIACAO", "RESOLVIDO"],
    estadoInicial: "NOVO",
    ativo: true,
    transicoes: [
      {
        id: "t1",
        de: "NOVO",
        para: "EM_CONTATO",
        gatilho: "PRIMEIRO_CONTATO",
        condicao: null,
        acao: "NOTIFICAR",
      },
      {
        id: "t2",
        de: "EM_CONTATO",
        para: "NEGOCIACAO",
        gatilho: "RESPOSTA_POSITIVA",
        condicao: { campo: "valorDivida", operador: "MENOR_QUE", valor: 10000 },
        acao: null,
      },
      {
        id: "t3",
        de: "EM_CONTATO",
        para: "RESOLVIDO",
        gatilho: "RESPOSTA_POSITIVA",
        condicao: { campo: "valorDivida", operador: "MAIOR_QUE", valor: 10000 },
        acao: "ESCALAR_JURIDICO",
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe("WorkflowEngine", () => {
  it("encontra a transição para o estado+gatilho sem condição", () => {
    const transicao = WorkflowEngine.encontrarTransicao(
      buildDefinicao(),
      "NOVO",
      "PRIMEIRO_CONTATO",
    );

    expect(transicao?.para).toBe("EM_CONTATO");
    expect(transicao?.acao).toBe("NOTIFICAR");
  });

  it("devolve null quando nenhuma transição casa o estado+gatilho", () => {
    expect(
      WorkflowEngine.encontrarTransicao(buildDefinicao(), "RESOLVIDO", "PRIMEIRO_CONTATO"),
    ).toBeNull();
  });

  it("escolhe a transição cuja condição é satisfeita pelo contexto", () => {
    const transicao = WorkflowEngine.encontrarTransicao(
      buildDefinicao(),
      "EM_CONTATO",
      "RESPOSTA_POSITIVA",
      { valorDivida: 5000 },
    );

    expect(transicao?.para).toBe("NEGOCIACAO");
  });

  it("escolhe a transição alternativa quando a condição da primeira não é satisfeita", () => {
    const transicao = WorkflowEngine.encontrarTransicao(
      buildDefinicao(),
      "EM_CONTATO",
      "RESPOSTA_POSITIVA",
      { valorDivida: 50000 },
    );

    expect(transicao?.para).toBe("RESOLVIDO");
    expect(transicao?.acao).toBe("ESCALAR_JURIDICO");
  });

  it("devolve null quando nenhuma condição é satisfeita", () => {
    expect(
      WorkflowEngine.encontrarTransicao(buildDefinicao(), "EM_CONTATO", "RESPOSTA_POSITIVA", {
        valorDivida: 10000,
      }),
    ).toBeNull();
  });
});
