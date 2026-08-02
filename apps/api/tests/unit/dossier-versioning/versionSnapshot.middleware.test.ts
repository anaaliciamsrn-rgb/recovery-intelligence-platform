import express, { Router } from "express";
import request from "supertest";
import type { ILogger } from "../../../src/application/ports/ILogger.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { SnapshotBuilder } from "../../../src/modules/dossier-versioning/application/services/SnapshotBuilder.js";
import { CreateVersionSnapshotUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/CreateVersionSnapshotUseCase.js";
import { createVersionSnapshotMiddleware } from "../../../src/modules/dossier-versioning/presentation/middlewares/versionSnapshot.middleware.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { BuildPromptUseCase } from "../../../src/modules/prompt-builder/application/use-cases/BuildPromptUseCase.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";
import { FakeClock, FakeIdGenerator, FakeVersionSnapshotRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);
const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

function buildApp(
  dossieRepository: FakeDossieRepository,
  pessoaRepository: FakePessoaRepository,
  versionSnapshotRepository: FakeVersionSnapshotRepository,
) {
  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
    new PendenciaFiscalPgfnRule(),
  ]);
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, [
    new RecomendarCobrancaAmigavelRule(),
  ]);
  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    new FakeEmpresaRepository(),
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );
  const snapshotBuilder = new SnapshotBuilder(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
  );
  const createVersionSnapshotUseCase = new CreateVersionSnapshotUseCase(
    snapshotBuilder,
    versionSnapshotRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  const middleware = createVersionSnapshotMiddleware(createVersionSnapshotUseCase, noopLogger);

  const app = express();
  app.use((req, _res, next) => {
    req.id = "req-fixo";
    req.auth = { userId: "user-1", sessionId: "s1", roles: ["ANALYST"] };
    next();
  });
  app.use(express.json());
  app.use(middleware);

  const dossieRouter = Router();
  dossieRouter.post("/", (req, res) => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
    dossieRepository.seed(dossie);
    res
      .status(201)
      .json({ id: "d1", subjectType: req.body.subjectType, subjectId: req.body.subjectId });
  });
  dossieRouter.post("/:id/evidencias", async (req, res) => {
    const dossie = await dossieRepository.findById(req.params.id!);
    if (!dossie) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Dossiê não encontrado" } });
      return;
    }
    dossie.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
      NOW,
    );
    await dossieRepository.save(dossie);
    res.status(204).send();
  });
  app.use("/api/v1/dossies", dossieRouter);

  return app;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("versionSnapshot.middleware", () => {
  it("cria a versão 1 quando um dossiê é criado com sucesso", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p1",
        cpf: CPF.create("52998224725"),
        nome: "Sujeito",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    const app = buildApp(dossieRepository, pessoaRepository, versionSnapshotRepository);

    await request(app).post("/api/v1/dossies").send({ subjectType: "PESSOA", subjectId: "p1" });
    await flush();

    const snapshot = await versionSnapshotRepository.findByDossieIdAndVersion("d1", 1);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.usuarioId).toBe("user-1");
  });

  it("cria a versão 2 quando uma evidência é atualizada com sucesso", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p1",
        cpf: CPF.create("52998224725"),
        nome: "Sujeito",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    const app = buildApp(dossieRepository, pessoaRepository, versionSnapshotRepository);

    await request(app).post("/api/v1/dossies").send({ subjectType: "PESSOA", subjectId: "p1" });
    await flush();
    await request(app).post("/api/v1/dossies/d1/evidencias").send({ fonte: "PGFN" });
    await flush();

    const v2 = await versionSnapshotRepository.findByDossieIdAndVersion("d1", 2);
    expect(v2).not.toBeNull();
    expect(v2?.classificacao).toBe("ALTO_RISCO");
  });

  it("não cria versão quando a atualização de evidência falha (404)", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    const app = buildApp(dossieRepository, pessoaRepository, versionSnapshotRepository);

    await request(app).post("/api/v1/dossies/inexistente/evidencias").send({ fonte: "PGFN" });
    await flush();

    expect(await versionSnapshotRepository.findByDossieId("inexistente")).toEqual([]);
  });
});
