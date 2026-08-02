import express, { Router } from "express";
import request from "supertest";
import type { ILogger } from "../../../src/application/ports/ILogger.js";
import { RecordAuditEventUseCase } from "../../../src/modules/audit-trail/application/use-cases/RecordAuditEventUseCase.js";
import { createAuditTrailMiddleware } from "../../../src/modules/audit-trail/presentation/middlewares/auditTrail.middleware.js";
import { FakeAuditEventRepository, FakeClock, FakeIdGenerator } from "./fakes.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

function buildApp(repository: FakeAuditEventRepository) {
  const recordAuditEventUseCase = new RecordAuditEventUseCase(
    repository,
    new FakeIdGenerator(),
    new FakeClock(new Date()),
  );
  const middleware = createAuditTrailMiddleware(recordAuditEventUseCase, noopLogger);

  const app = express();
  app.use((req, _res, next) => {
    req.id = "req-fixo";
    next();
  });
  app.use(express.json());
  app.use(middleware);

  const pessoaRouter = Router();
  pessoaRouter.post("/", (req, res) => {
    if (!req.body.nome) {
      res.status(400).json({ error: { code: "VALIDATION", message: "Nome é obrigatório" } });
      return;
    }
    res.status(201).json({ id: "pessoa-1", nome: req.body.nome });
  });
  pessoaRouter.get("/:cpf", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Pessoa não encontrada" } });
  });
  app.use("/api/v1/pessoas", pessoaRouter);

  const evidenciasRouter = Router();
  evidenciasRouter.post("/:id/evidencias", (_req, res) => {
    res.status(204).send();
  });
  app.use("/api/v1/dossies", evidenciasRouter);

  return app;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("auditTrail.middleware", () => {
  it("grava um evento de auditoria para uma rota observada, com sucesso", async () => {
    const repository = new FakeAuditEventRepository();
    const app = buildApp(repository);

    await request(app)
      .post("/api/v1/pessoas")
      .send({ nome: "Fulano", password: "nao-deveria-existir-aqui" });
    await flush();

    const pagina = await repository.findMany(
      {},
      { page: 1, pageSize: 10, sortBy: "timestamp", sortOrder: "desc" },
    );
    expect(pagina.items).toHaveLength(1);
    const evento = pagina.items[0]!;
    expect(evento.tipo).toBe("PESSOA_CRIADA");
    expect(evento.entidade).toBe("Pessoa");
    expect(evento.entidadeId).toBe("pessoa-1");
    expect(evento.outcome).toBe("SUCESSO");
    expect(evento.requestId).toBe("req-fixo");
    expect(evento.duracaoMs).toBeGreaterThanOrEqual(0);
  });

  it("nunca grava a senha em texto puro no payload", async () => {
    const repository = new FakeAuditEventRepository();
    const app = buildApp(repository);

    await request(app).post("/api/v1/pessoas").send({ nome: "Fulano", password: "segredo-real" });
    await flush();

    const pagina = await repository.findMany(
      {},
      { page: 1, pageSize: 10, sortBy: "timestamp", sortOrder: "desc" },
    );
    const payload = pagina.items[0]!.payload as { request: { password?: string } };
    expect(payload.request.password).toBe("[REDACTED]");
  });

  it("grava outcome FALHA com a mensagem de erro real quando a resposta é um erro", async () => {
    const repository = new FakeAuditEventRepository();
    const app = buildApp(repository);

    await request(app).post("/api/v1/pessoas").send({});
    await flush();

    const pagina = await repository.findMany(
      {},
      { page: 1, pageSize: 10, sortBy: "timestamp", sortOrder: "desc" },
    );
    expect(pagina.items).toHaveLength(1);
    expect(pagina.items[0]?.outcome).toBe("FALHA");
    expect(pagina.items[0]?.mensagem).toBe("Nome é obrigatório");
    expect(pagina.items[0]?.entidadeId).toBeNull();
  });

  it("grava EVIDENCIA_ATUALIZADA com o id do dossiê extraído dos params, mesmo sem corpo de resposta (204)", async () => {
    const repository = new FakeAuditEventRepository();
    const app = buildApp(repository);

    await request(app).post("/api/v1/dossies/dossie-42/evidencias").send({ fonte: "PGFN" });
    await flush();

    const pagina = await repository.findMany(
      {},
      { page: 1, pageSize: 10, sortBy: "timestamp", sortOrder: "desc" },
    );
    expect(pagina.items).toHaveLength(1);
    expect(pagina.items[0]?.entidadeId).toBe("dossie-42");
    expect(pagina.items[0]?.outcome).toBe("SUCESSO");
  });

  it("não grava nada para uma rota fora da lista auditável", async () => {
    const repository = new FakeAuditEventRepository();
    const app = buildApp(repository);

    await request(app).get("/api/v1/pessoas/52998224725");
    await flush();

    const pagina = await repository.findMany(
      {},
      { page: 1, pageSize: 10, sortBy: "timestamp", sortOrder: "desc" },
    );
    expect(pagina.items).toEqual([]);
  });
});
