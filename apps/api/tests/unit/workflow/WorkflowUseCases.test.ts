import { CreateWorkflowDefinitionUseCase } from "../../../src/modules/workflow/application/use-cases/CreateWorkflowDefinitionUseCase.js";
import { GetWorkflowInstanceUseCase } from "../../../src/modules/workflow/application/use-cases/GetWorkflowInstanceUseCase.js";
import { StartWorkflowInstanceUseCase } from "../../../src/modules/workflow/application/use-cases/StartWorkflowInstanceUseCase.js";
import { TriggerWorkflowTransitionUseCase } from "../../../src/modules/workflow/application/use-cases/TriggerWorkflowTransitionUseCase.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeWorkflowDefinitionRepository,
  FakeWorkflowInstanceHistoryRepository,
  FakeWorkflowInstanceRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("CreateWorkflowDefinitionUseCase", () => {
  it("cria uma definição válida sem nenhum código novo — só dados", async () => {
    const workflowDefinitionRepository = new FakeWorkflowDefinitionRepository();
    const useCase = new CreateWorkflowDefinitionUseCase(
      workflowDefinitionRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const definicao = await useCase.execute({
      nome: "Fluxo de teste",
      descricao: null,
      estados: ["NOVO", "RESOLVIDO"],
      estadoInicial: "NOVO",
      transicoes: [
        { de: "NOVO", para: "RESOLVIDO", gatilho: "MANUAL", condicao: null, acao: null },
      ],
    });

    expect(await workflowDefinitionRepository.findById(definicao.id)).not.toBeNull();
  });

  it("lança VALIDATION quando a definição é inválida", async () => {
    const useCase = new CreateWorkflowDefinitionUseCase(
      new FakeWorkflowDefinitionRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({
        nome: "x",
        descricao: null,
        estados: ["NOVO"],
        estadoInicial: "INEXISTENTE",
        transicoes: [],
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("StartWorkflowInstanceUseCase + TriggerWorkflowTransitionUseCase + GetWorkflowInstanceUseCase", () => {
  async function buildScenario() {
    const workflowDefinitionRepository = new FakeWorkflowDefinitionRepository();
    const idGenerator = new FakeIdGenerator();
    const clock = new FakeClock(NOW);
    const createUseCase = new CreateWorkflowDefinitionUseCase(
      workflowDefinitionRepository,
      idGenerator,
      clock,
    );
    const definicao = await createUseCase.execute({
      nome: "Fluxo",
      descricao: null,
      estados: ["NOVO", "EM_CONTATO", "RESOLVIDO"],
      estadoInicial: "NOVO",
      transicoes: [
        { de: "NOVO", para: "EM_CONTATO", gatilho: "CONTATO", condicao: null, acao: null },
        {
          de: "EM_CONTATO",
          para: "RESOLVIDO",
          gatilho: "PAGAMENTO",
          condicao: null,
          acao: "ENCERRAR_CASE",
        },
      ],
    });

    const workflowInstanceRepository = new FakeWorkflowInstanceRepository();
    const workflowInstanceHistoryRepository = new FakeWorkflowInstanceHistoryRepository();
    const startUseCase = new StartWorkflowInstanceUseCase(
      workflowDefinitionRepository,
      workflowInstanceRepository,
      idGenerator,
      clock,
    );
    const triggerUseCase = new TriggerWorkflowTransitionUseCase(
      workflowDefinitionRepository,
      workflowInstanceRepository,
      workflowInstanceHistoryRepository,
      idGenerator,
      clock,
    );
    const getInstanceUseCase = new GetWorkflowInstanceUseCase(
      workflowInstanceRepository,
      workflowInstanceHistoryRepository,
    );

    return {
      definicao,
      startUseCase,
      triggerUseCase,
      getInstanceUseCase,
      workflowInstanceRepository,
    };
  }

  it("inicia a instância no estado inicial da definição", async () => {
    const { definicao, startUseCase } = await buildScenario();

    const instancia = await startUseCase.execute({
      workflowDefinitionId: definicao.id,
      referenciaId: "case-1",
    });

    expect(instancia.estadoAtual).toBe("NOVO");
  });

  it("aplica a transição e registra na timeline da instância", async () => {
    const { definicao, startUseCase, triggerUseCase, getInstanceUseCase } = await buildScenario();
    const instancia = await startUseCase.execute({
      workflowDefinitionId: definicao.id,
      referenciaId: "case-1",
    });

    const resultado = await triggerUseCase.execute({
      workflowInstanceId: instancia.id,
      gatilho: "CONTATO",
    });

    expect(resultado).toEqual({ estadoAnterior: "NOVO", estadoNovo: "EM_CONTATO", acao: null });

    const detalhe = await getInstanceUseCase.execute(instancia.id);
    expect(detalhe.instancia.estadoAtual).toBe("EM_CONTATO");
    expect(detalhe.historico).toHaveLength(1);
    expect(detalhe.historico[0]?.gatilho).toBe("CONTATO");
  });

  it("lança VALIDATION quando não há transição aplicável", async () => {
    const { definicao, startUseCase, triggerUseCase } = await buildScenario();
    const instancia = await startUseCase.execute({
      workflowDefinitionId: definicao.id,
      referenciaId: "case-1",
    });

    await expect(
      triggerUseCase.execute({ workflowInstanceId: instancia.id, gatilho: "PAGAMENTO" }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });

  it("lança NOT_FOUND quando a instância não existe", async () => {
    const { triggerUseCase } = await buildScenario();

    await expect(
      triggerUseCase.execute({ workflowInstanceId: "inexistente", gatilho: "CONTATO" }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("devolve o acao da transição aplicada", async () => {
    const { definicao, startUseCase, triggerUseCase } = await buildScenario();
    const instancia = await startUseCase.execute({
      workflowDefinitionId: definicao.id,
      referenciaId: "case-1",
    });
    await triggerUseCase.execute({ workflowInstanceId: instancia.id, gatilho: "CONTATO" });

    const resultado = await triggerUseCase.execute({
      workflowInstanceId: instancia.id,
      gatilho: "PAGAMENTO",
    });

    expect(resultado.acao).toBe("ENCERRAR_CASE");
  });
});
