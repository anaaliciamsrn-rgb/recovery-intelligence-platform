import { CreateRuleDefinitionUseCase } from "../../../src/modules/rule-builder/application/use-cases/CreateRuleDefinitionUseCase.js";
import { EvaluateRulesUseCase } from "../../../src/modules/rule-builder/application/use-cases/EvaluateRulesUseCase.js";
import { GetRuleDefinitionUseCase } from "../../../src/modules/rule-builder/application/use-cases/GetRuleDefinitionUseCase.js";
import { ListRuleDefinitionsUseCase } from "../../../src/modules/rule-builder/application/use-cases/ListRuleDefinitionsUseCase.js";
import { UpdateRuleDefinitionUseCase } from "../../../src/modules/rule-builder/application/use-cases/UpdateRuleDefinitionUseCase.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeRuleDefinitionRepository,
  FakeRuleVersionRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildCreateInput(
  overrides: Partial<Parameters<CreateRuleDefinitionUseCase["execute"]>[0]> = {},
) {
  return {
    nome: "Score alto para dívida vencida",
    descricao: null,
    recurso: "classificacao",
    condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE" as const, valor: 90 }],
    peso: 10,
    prioridade: 1,
    acao: "AUMENTAR_RISCO",
    ativo: true,
    ...overrides,
  };
}

describe("CreateRuleDefinitionUseCase", () => {
  it("cria a regra na versão 1 e grava a primeira entrada de histórico", async () => {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const useCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const regra = await useCase.execute(buildCreateInput());

    expect(regra.versaoAtual).toBe(1);
    expect(await ruleDefinitionRepository.findById(regra.id)).not.toBeNull();
    const versoes = await ruleVersionRepository.findByRuleDefinitionId(regra.id);
    expect(versoes).toHaveLength(1);
    expect(versoes[0]?.versao).toBe(1);
  });

  it("lança VALIDATION quando a regra é inválida", async () => {
    const useCase = new CreateRuleDefinitionUseCase(
      new FakeRuleDefinitionRepository(),
      new FakeRuleVersionRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(useCase.execute(buildCreateInput({ condicoes: [] }))).rejects.toMatchObject({
      kind: "VALIDATION",
    });
  });
});

describe("UpdateRuleDefinitionUseCase", () => {
  async function buildScenario() {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const idGenerator = new FakeIdGenerator();
    const clock = new FakeClock(NOW);
    const createUseCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      idGenerator,
      clock,
    );
    const updateUseCase = new UpdateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      idGenerator,
      clock,
    );
    const regra = await createUseCase.execute(buildCreateInput());
    return { regra, updateUseCase, ruleVersionRepository, clock };
  }

  it("revisa a regra e soma uma nova entrada ao histórico, sem apagar a anterior", async () => {
    const { regra, updateUseCase, ruleVersionRepository, clock } = await buildScenario();
    clock.set(new Date("2026-01-02T00:00:00Z"));

    const revisada = await updateUseCase.execute({
      ruleDefinitionId: regra.id,
      nome: "Nome revisado",
      descricao: "agora com descrição",
      condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 120 }],
      peso: 20,
      prioridade: 2,
      acao: "ESCALAR",
      ativo: false,
    });

    expect(revisada.versaoAtual).toBe(2);
    const versoes = await ruleVersionRepository.findByRuleDefinitionId(regra.id);
    expect(versoes.map((v) => v.versao)).toEqual([2, 1]);
    expect(versoes[0]?.nome).toBe("Nome revisado");
    expect(versoes[1]?.nome).toBe("Score alto para dívida vencida");
  });

  it("lança NOT_FOUND quando a regra não existe", async () => {
    const { updateUseCase } = await buildScenario();

    await expect(
      updateUseCase.execute({
        ruleDefinitionId: "inexistente",
        nome: "x",
        descricao: null,
        condicoes: [{ campo: "a", operador: "IGUAL", valor: 1 }],
        peso: 1,
        prioridade: 1,
        acao: "A",
        ativo: true,
      }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("lança VALIDATION quando a revisão é inválida", async () => {
    const { regra, updateUseCase } = await buildScenario();

    await expect(
      updateUseCase.execute({
        ruleDefinitionId: regra.id,
        nome: "x",
        descricao: null,
        condicoes: [],
        peso: 1,
        prioridade: 1,
        acao: "A",
        ativo: true,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("GetRuleDefinitionUseCase + ListRuleDefinitionsUseCase", () => {
  it("GetRuleDefinitionUseCase devolve a regra com o histórico completo", async () => {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const createUseCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const getUseCase = new GetRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
    );

    const regra = await createUseCase.execute(buildCreateInput());
    const detalhe = await getUseCase.execute(regra.id);

    expect(detalhe.regra.id).toBe(regra.id);
    expect(detalhe.versoes).toHaveLength(1);
  });

  it("GetRuleDefinitionUseCase lança NOT_FOUND para regra inexistente", async () => {
    const getUseCase = new GetRuleDefinitionUseCase(
      new FakeRuleDefinitionRepository(),
      new FakeRuleVersionRepository(),
    );
    await expect(getUseCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("ListRuleDefinitionsUseCase filtra por recurso e ativo, e devolve uma página com total", async () => {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const createUseCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const listUseCase = new ListRuleDefinitionsUseCase(ruleDefinitionRepository);

    await createUseCase.execute(buildCreateInput({ recurso: "classificacao" }));
    await createUseCase.execute(buildCreateInput({ recurso: "workflow" }));

    const filtrado = await listUseCase.execute({ recurso: "classificacao" });
    expect(filtrado.items).toHaveLength(1);
    expect(filtrado.total).toBe(1);

    const todos = await listUseCase.execute();
    expect(todos.items).toHaveLength(2);
    expect(todos.total).toBe(2);
    expect(todos.page).toBe(1);
    expect(todos.pageSize).toBe(50);
  });

  it("ListRuleDefinitionsUseCase pagina os resultados", async () => {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const createUseCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const listUseCase = new ListRuleDefinitionsUseCase(ruleDefinitionRepository);

    await createUseCase.execute(buildCreateInput({ nome: "Regra A" }));
    await createUseCase.execute(buildCreateInput({ nome: "Regra B" }));
    await createUseCase.execute(buildCreateInput({ nome: "Regra C" }));

    const primeiraPagina = await listUseCase.execute({}, { page: 1, pageSize: 2 });
    expect(primeiraPagina.items).toHaveLength(2);
    expect(primeiraPagina.total).toBe(3);

    const segundaPagina = await listUseCase.execute({}, { page: 2, pageSize: 2 });
    expect(segundaPagina.items).toHaveLength(1);
  });
});

describe("EvaluateRulesUseCase", () => {
  it("avalia só as regras ativas do recurso pedido", async () => {
    const ruleDefinitionRepository = new FakeRuleDefinitionRepository();
    const ruleVersionRepository = new FakeRuleVersionRepository();
    const createUseCase = new CreateRuleDefinitionUseCase(
      ruleDefinitionRepository,
      ruleVersionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const evaluateUseCase = new EvaluateRulesUseCase(ruleDefinitionRepository);

    await createUseCase.execute(
      buildCreateInput({
        recurso: "classificacao",
        condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 90 }],
      }),
    );
    await createUseCase.execute(
      buildCreateInput({
        recurso: "outro-recurso",
        condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 0 }],
      }),
    );

    const resultado = await evaluateUseCase.execute({
      recurso: "classificacao",
      contexto: { diasAtraso: 120 },
    });

    expect(resultado.regrasCasadas).toHaveLength(1);
    expect(resultado.regrasCasadas[0]?.regra.recurso).toBe("classificacao");
  });
});
