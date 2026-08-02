import { AuditEvent } from "../../../src/modules/audit-trail/domain/entities/AuditEvent.js";
import { GetAuditEventByIdUseCase } from "../../../src/modules/audit-trail/application/use-cases/GetAuditEventByIdUseCase.js";
import { ListAuditEventsByEntityUseCase } from "../../../src/modules/audit-trail/application/use-cases/ListAuditEventsByEntityUseCase.js";
import { ListAuditEventsByRequestIdUseCase } from "../../../src/modules/audit-trail/application/use-cases/ListAuditEventsByRequestIdUseCase.js";
import { ListAuditEventsByUserUseCase } from "../../../src/modules/audit-trail/application/use-cases/ListAuditEventsByUserUseCase.js";
import { ListAuditEventsUseCase } from "../../../src/modules/audit-trail/application/use-cases/ListAuditEventsUseCase.js";
import { FakeAuditEventRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
  sortBy: "timestamp" as const,
  sortOrder: "desc" as const,
};

function buildEvent(overrides: Partial<Parameters<typeof AuditEvent.create>[0]> = {}) {
  return AuditEvent.create({
    id: "evt-1",
    timestamp: NOW,
    usuarioId: "user-1",
    entidade: "Pessoa",
    entidadeId: "pessoa-1",
    tipo: "PESSOA_CRIADA",
    payload: {},
    requestId: "req-1",
    ip: "127.0.0.1",
    userAgent: "jest",
    duracaoMs: 10,
    outcome: "SUCESSO",
    mensagem: "ok",
    ...overrides,
  });
}

describe("ListAuditEventsUseCase", () => {
  it("aplica filtro e paginação delegando ao repositório", async () => {
    const repository = new FakeAuditEventRepository();
    repository.seed(buildEvent({ id: "evt-1", tipo: "PESSOA_CRIADA" }));
    repository.seed(buildEvent({ id: "evt-2", tipo: "EMPRESA_CRIADA" }));
    const useCase = new ListAuditEventsUseCase(repository);

    const page = await useCase.execute({
      filter: { tipo: "EMPRESA_CRIADA" },
      pagination: DEFAULT_PAGINATION,
    });

    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe("evt-2");
  });
});

describe("GetAuditEventByIdUseCase", () => {
  it("devolve o evento quando existe", async () => {
    const repository = new FakeAuditEventRepository();
    repository.seed(buildEvent());
    const useCase = new GetAuditEventByIdUseCase(repository);

    const event = await useCase.execute("evt-1");

    expect(event.id).toBe("evt-1");
  });

  it("lança NOT_FOUND quando não existe", async () => {
    const useCase = new GetAuditEventByIdUseCase(new FakeAuditEventRepository());

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("ListAuditEventsByEntityUseCase", () => {
  it("filtra por entidade e entidadeId", async () => {
    const repository = new FakeAuditEventRepository();
    repository.seed(buildEvent({ id: "evt-1", entidade: "Pessoa", entidadeId: "pessoa-1" }));
    repository.seed(buildEvent({ id: "evt-2", entidade: "Pessoa", entidadeId: "pessoa-2" }));
    const useCase = new ListAuditEventsByEntityUseCase(repository);

    const page = await useCase.execute({
      entidade: "Pessoa",
      entidadeId: "pessoa-2",
      pagination: DEFAULT_PAGINATION,
    });

    expect(page.items.map((e) => e.id)).toEqual(["evt-2"]);
  });
});

describe("ListAuditEventsByUserUseCase", () => {
  it("filtra por usuarioId", async () => {
    const repository = new FakeAuditEventRepository();
    repository.seed(buildEvent({ id: "evt-1", usuarioId: "user-1" }));
    repository.seed(buildEvent({ id: "evt-2", usuarioId: "user-2" }));
    const useCase = new ListAuditEventsByUserUseCase(repository);

    const page = await useCase.execute({ usuarioId: "user-2", pagination: DEFAULT_PAGINATION });

    expect(page.items.map((e) => e.id)).toEqual(["evt-2"]);
  });
});

describe("ListAuditEventsByRequestIdUseCase", () => {
  it("devolve todos os eventos daquele requestId", async () => {
    const repository = new FakeAuditEventRepository();
    repository.seed(buildEvent({ id: "evt-1", requestId: "req-a" }));
    repository.seed(buildEvent({ id: "evt-2", requestId: "req-b" }));
    const useCase = new ListAuditEventsByRequestIdUseCase(repository);

    const events = await useCase.execute("req-a");

    expect(events.map((e) => e.id)).toEqual(["evt-1"]);
  });

  it("devolve lista vazia quando nenhum evento tem esse requestId", async () => {
    const useCase = new ListAuditEventsByRequestIdUseCase(new FakeAuditEventRepository());

    expect(await useCase.execute("inexistente")).toEqual([]);
  });
});
