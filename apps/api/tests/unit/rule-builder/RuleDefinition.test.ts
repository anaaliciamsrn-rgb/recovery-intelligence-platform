import {
  InvalidRuleDefinitionError,
  RuleDefinition,
} from "../../../src/modules/rule-builder/domain/entities/RuleDefinition.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProps() {
  return {
    id: "rule-1",
    nome: "Score alto para dívida vencida",
    descricao: null,
    recurso: "classificacao",
    condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE" as const, valor: 90 }],
    peso: 10,
    prioridade: 1,
    acao: "AUMENTAR_RISCO",
    ativo: true,
    versaoAtual: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("RuleDefinition", () => {
  it("cria uma regra válida na versão 1", () => {
    const regra = RuleDefinition.create(buildProps());
    expect(regra.versaoAtual).toBe(1);
    expect(regra.condicoes).toHaveLength(1);
  });

  it("rejeita nome vazio", () => {
    expect(() => RuleDefinition.create({ ...buildProps(), nome: "  " })).toThrow(
      InvalidRuleDefinitionError,
    );
  });

  it("rejeita recurso vazio", () => {
    expect(() => RuleDefinition.create({ ...buildProps(), recurso: "" })).toThrow(
      InvalidRuleDefinitionError,
    );
  });

  it("rejeita regra sem nenhuma condição", () => {
    expect(() => RuleDefinition.create({ ...buildProps(), condicoes: [] })).toThrow(
      InvalidRuleDefinitionError,
    );
  });

  it("rejeita peso negativo", () => {
    expect(() => RuleDefinition.create({ ...buildProps(), peso: -1 })).toThrow(
      InvalidRuleDefinitionError,
    );
  });

  it("rejeita prioridade não-inteira ou negativa", () => {
    expect(() => RuleDefinition.create({ ...buildProps(), prioridade: 1.5 })).toThrow(
      InvalidRuleDefinitionError,
    );
    expect(() => RuleDefinition.create({ ...buildProps(), prioridade: -1 })).toThrow(
      InvalidRuleDefinitionError,
    );
  });

  it("revisar() avança versaoAtual e atualiza os campos, nunca reescreve a versão anterior no próprio objeto de entrada", () => {
    const regra = RuleDefinition.create(buildProps());
    const depois = new Date("2026-01-02T00:00:00Z");

    regra.revisar(
      {
        nome: "Novo nome",
        descricao: "agora com descrição",
        condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 120 }],
        peso: 20,
        prioridade: 2,
        acao: "ESCALAR",
        ativo: false,
      },
      depois,
    );

    expect(regra.versaoAtual).toBe(2);
    expect(regra.nome).toBe("Novo nome");
    expect(regra.peso).toBe(20);
    expect(regra.ativo).toBe(false);
    expect(regra.updatedAt).toEqual(depois);
  });

  it("revisar() valida a nova revisão com as mesmas regras de create()", () => {
    const regra = RuleDefinition.create(buildProps());
    expect(() =>
      regra.revisar(
        {
          nome: "x",
          descricao: null,
          condicoes: [],
          peso: 1,
          prioridade: 1,
          acao: "A",
          ativo: true,
        },
        NOW,
      ),
    ).toThrow(InvalidRuleDefinitionError);
  });
});
