import { CreateScheduledJobUseCase } from "../../../src/modules/scheduler/application/use-cases/CreateScheduledJobUseCase.js";
import { GetScheduledJobUseCase } from "../../../src/modules/scheduler/application/use-cases/GetScheduledJobUseCase.js";
import { ListScheduledJobsUseCase } from "../../../src/modules/scheduler/application/use-cases/ListScheduledJobsUseCase.js";
import { RunDueJobsUseCase } from "../../../src/modules/scheduler/application/use-cases/RunDueJobsUseCase.js";
import { ScheduledJobStatus } from "../../../src/modules/scheduler/domain/value-objects/ScheduledJobStatus.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeJobExecutionRepository,
  FakeJobHandlerRegistry,
  FakeScheduledJobRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("CreateScheduledJobUseCase", () => {
  it("agenda um job novo", async () => {
    const scheduledJobRepository = new FakeScheduledJobRepository();
    const useCase = new CreateScheduledJobUseCase(
      scheduledJobRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const job = await useCase.execute({
      nome: "Lembrete",
      tipo: "case.followup-reminder",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });

    expect(job.status).toBe(ScheduledJobStatus.PENDENTE);
    expect(await scheduledJobRepository.findById(job.id)).not.toBeNull();
  });

  it("lança VALIDATION quando o job é inválido", async () => {
    const useCase = new CreateScheduledJobUseCase(
      new FakeScheduledJobRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    await expect(
      useCase.execute({ nome: "x", tipo: "", payload: {}, agendadoPara: NOW, maxTentativas: 3 }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("GetScheduledJobUseCase + ListScheduledJobsUseCase", () => {
  it("GetScheduledJobUseCase devolve o job com seu histórico de execuções", async () => {
    const scheduledJobRepository = new FakeScheduledJobRepository();
    const jobExecutionRepository = new FakeJobExecutionRepository();
    const createUseCase = new CreateScheduledJobUseCase(
      scheduledJobRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const getUseCase = new GetScheduledJobUseCase(scheduledJobRepository, jobExecutionRepository);

    const job = await createUseCase.execute({
      nome: "Lembrete",
      tipo: "case.followup-reminder",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });
    const detalhe = await getUseCase.execute(job.id);

    expect(detalhe.job.id).toBe(job.id);
    expect(detalhe.execucoes).toHaveLength(0);
  });

  it("GetScheduledJobUseCase lança NOT_FOUND para job inexistente", async () => {
    const getUseCase = new GetScheduledJobUseCase(
      new FakeScheduledJobRepository(),
      new FakeJobExecutionRepository(),
    );
    await expect(getUseCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("ListScheduledJobsUseCase filtra por status", async () => {
    const scheduledJobRepository = new FakeScheduledJobRepository();
    const createUseCase = new CreateScheduledJobUseCase(
      scheduledJobRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const listUseCase = new ListScheduledJobsUseCase(scheduledJobRepository);

    await createUseCase.execute({
      nome: "A",
      tipo: "tipo.a",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });

    expect((await listUseCase.execute({ status: ScheduledJobStatus.PENDENTE })).items).toHaveLength(
      1,
    );
    expect(
      (await listUseCase.execute({ status: ScheduledJobStatus.CONCLUIDO })).items,
    ).toHaveLength(0);
  });
});

describe("RunDueJobsUseCase", () => {
  async function buildScenario() {
    const scheduledJobRepository = new FakeScheduledJobRepository();
    const jobExecutionRepository = new FakeJobExecutionRepository();
    const jobHandlerRegistry = new FakeJobHandlerRegistry();
    const idGenerator = new FakeIdGenerator();
    const clock = new FakeClock(NOW);
    const createUseCase = new CreateScheduledJobUseCase(scheduledJobRepository, idGenerator, clock);
    const runDueUseCase = new RunDueJobsUseCase(
      scheduledJobRepository,
      jobExecutionRepository,
      jobHandlerRegistry,
      idGenerator,
      clock,
    );
    return {
      scheduledJobRepository,
      jobExecutionRepository,
      jobHandlerRegistry,
      createUseCase,
      runDueUseCase,
      clock,
    };
  }

  it("executa um job devido com handler registrado e o conclui com sucesso", async () => {
    const {
      createUseCase,
      runDueUseCase,
      jobHandlerRegistry,
      scheduledJobRepository,
      jobExecutionRepository,
    } = await buildScenario();
    const chamadas: Record<string, unknown>[] = [];
    jobHandlerRegistry.register("case.followup-reminder", {
      handle: async (payload) => void chamadas.push(payload),
    });

    const job = await createUseCase.execute({
      nome: "Lembrete",
      tipo: "case.followup-reminder",
      payload: { caseId: "c1" },
      agendadoPara: NOW,
      maxTentativas: 3,
    });

    const resumo = await runDueUseCase.execute();

    expect(resumo).toEqual({ executados: 1, concluidos: 1, reagendados: 0, mortos: 0 });
    expect(chamadas).toEqual([{ caseId: "c1" }]);
    const salvo = await scheduledJobRepository.findById(job.id);
    expect(salvo?.status).toBe(ScheduledJobStatus.CONCLUIDO);
    const execucoes = await jobExecutionRepository.findByScheduledJobId(job.id);
    expect(execucoes).toHaveLength(1);
    expect(execucoes[0]?.status).toBe("SUCESSO");
  });

  it("ignora jobs cuja agendadoPara ainda não chegou", async () => {
    const { createUseCase, runDueUseCase } = await buildScenario();
    const futuro = new Date(NOW.getTime() + 3_600_000);
    await createUseCase.execute({
      nome: "Futuro",
      tipo: "algum.tipo",
      payload: {},
      agendadoPara: futuro,
      maxTentativas: 3,
    });

    const resumo = await runDueUseCase.execute();

    expect(resumo).toEqual({ executados: 0, concluidos: 0, reagendados: 0, mortos: 0 });
  });

  it("reagenda com backoff quando não há handler registrado e ainda restam tentativas", async () => {
    const { createUseCase, runDueUseCase, scheduledJobRepository, jobExecutionRepository } =
      await buildScenario();
    const job = await createUseCase.execute({
      nome: "Sem handler",
      tipo: "tipo.sem-handler",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });

    const resumo = await runDueUseCase.execute();

    expect(resumo).toEqual({ executados: 1, concluidos: 0, reagendados: 1, mortos: 0 });
    const salvo = await scheduledJobRepository.findById(job.id);
    expect(salvo?.status).toBe(ScheduledJobStatus.PENDENTE);
    expect(salvo?.tentativas).toBe(1);
    expect(salvo?.agendadoPara.getTime()).toBeGreaterThan(NOW.getTime());
    expect(salvo?.ultimoErro).toContain("Nenhum handler registrado");
    const execucoes = await jobExecutionRepository.findByScheduledJobId(job.id);
    expect(execucoes[0]?.status).toBe("FALHA");
  });

  it("vai para MORTO (fila-morta) quando o handler falha e esgota maxTentativas", async () => {
    const { createUseCase, runDueUseCase, jobHandlerRegistry, scheduledJobRepository } =
      await buildScenario();
    jobHandlerRegistry.register("tipo.instavel", {
      handle: async () => {
        throw new Error("falha permanente");
      },
    });
    const job = await createUseCase.execute({
      nome: "Instável",
      tipo: "tipo.instavel",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 1,
    });

    const resumo = await runDueUseCase.execute();

    expect(resumo).toEqual({ executados: 1, concluidos: 0, reagendados: 0, mortos: 1 });
    const salvo = await scheduledJobRepository.findById(job.id);
    expect(salvo?.status).toBe(ScheduledJobStatus.MORTO);
    expect(salvo?.ultimoErro).toBe("falha permanente");
  });

  it("respeita o limite de jobs processados por chamada", async () => {
    const { createUseCase, runDueUseCase, jobHandlerRegistry } = await buildScenario();
    jobHandlerRegistry.register("tipo.rapido", { handle: async () => {} });
    await createUseCase.execute({
      nome: "A",
      tipo: "tipo.rapido",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });
    await createUseCase.execute({
      nome: "B",
      tipo: "tipo.rapido",
      payload: {},
      agendadoPara: NOW,
      maxTentativas: 3,
    });

    const resumo = await runDueUseCase.execute(1);

    expect(resumo.executados).toBe(1);
  });
});
