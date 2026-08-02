import {
  InvalidWorkflowDefinitionError,
  WorkflowDefinition,
} from "../../../src/modules/workflow/domain/entities/WorkflowDefinition.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProps(overrides: Partial<Parameters<typeof WorkflowDefinition.create>[0]> = {}) {
  return {
    id: "wf-1",
    nome: "Cobrança padrão",
    descricao: null,
    estados: ["NOVO", "EM_CONTATO", "RESOLVIDO"],
    estadoInicial: "NOVO",
    ativo: true,
    transicoes: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("WorkflowDefinition", () => {
  it("cria uma definição válida", () => {
    const definicao = WorkflowDefinition.create(buildProps());

    expect(definicao.estadoInicial).toBe("NOVO");
    expect(definicao.estados).toEqual(["NOVO", "EM_CONTATO", "RESOLVIDO"]);
  });

  it("rejeita estado inicial fora da lista de estados", () => {
    expect(() => WorkflowDefinition.create(buildProps({ estadoInicial: "INEXISTENTE" }))).toThrow(
      InvalidWorkflowDefinitionError,
    );
  });

  it("rejeita transição que referencia um estado inexistente", () => {
    const transicoes = [
      { id: "t1", de: "NOVO", para: "INEXISTENTE", gatilho: "MANUAL", condicao: null, acao: null },
    ];

    expect(() => WorkflowDefinition.create(buildProps({ transicoes }))).toThrow(
      InvalidWorkflowDefinitionError,
    );
  });

  it("aceita transições válidas", () => {
    const transicoes = [
      { id: "t1", de: "NOVO", para: "EM_CONTATO", gatilho: "MANUAL", condicao: null, acao: null },
    ];

    const definicao = WorkflowDefinition.create(buildProps({ transicoes }));

    expect(definicao.transicoes).toEqual(transicoes);
  });
});
