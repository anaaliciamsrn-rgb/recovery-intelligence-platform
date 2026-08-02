import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { SnapshotBuilder } from "../../../src/modules/dossier-versioning/application/services/SnapshotBuilder.js";
import { CreateVersionSnapshotUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/CreateVersionSnapshotUseCase.js";
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

function buildUseCase(
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

  return new CreateVersionSnapshotUseCase(
    snapshotBuilder,
    versionSnapshotRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
}

function seedDossieEPessoa(
  dossieRepository: FakeDossieRepository,
  pessoaRepository: FakePessoaRepository,
) {
  const dossie = Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW });
  dossieRepository.seed(dossie);
  pessoaRepository.seed(
    Pessoa.create({
      id: "p1",
      cpf: CPF.create("52998224725"),
      nome: "Sujeito de Teste",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  return dossie;
}

describe("CreateVersionSnapshotUseCase", () => {
  it("cria a versão 1 quando o dossiê ainda não tem nenhuma versão", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    seedDossieEPessoa(dossieRepository, pessoaRepository);
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();

    const useCase = buildUseCase(dossieRepository, pessoaRepository, versionSnapshotRepository);
    const snapshot = await useCase.execute({ dossieId: "d1", usuarioId: "user-1" });

    expect(snapshot.versao).toBe(1);
    expect(snapshot.usuarioId).toBe("user-1");
    expect(snapshot.timestamp).toEqual(NOW);
    expect(snapshot.hash).toMatch(/^[0-9a-f]{64}$/);

    const persistido = await versionSnapshotRepository.findByDossieIdAndVersion("d1", 1);
    expect(persistido).not.toBeNull();
  });

  it("cria a próxima versão (max + 1) quando já existem versões anteriores", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    const dossie = seedDossieEPessoa(dossieRepository, pessoaRepository);
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();

    const useCase = buildUseCase(dossieRepository, pessoaRepository, versionSnapshotRepository);
    await useCase.execute({ dossieId: "d1", usuarioId: "user-1" });

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

    const segundaVersao = await useCase.execute({ dossieId: "d1", usuarioId: "user-2" });

    expect(segundaVersao.versao).toBe(2);
    expect(segundaVersao.classificacao).toBe("ALTO_RISCO");
  });

  it("aceita usuarioId nulo", async () => {
    const dossieRepository = new FakeDossieRepository();
    const pessoaRepository = new FakePessoaRepository();
    seedDossieEPessoa(dossieRepository, pessoaRepository);
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();

    const useCase = buildUseCase(dossieRepository, pessoaRepository, versionSnapshotRepository);
    const snapshot = await useCase.execute({ dossieId: "d1", usuarioId: null });

    expect(snapshot.usuarioId).toBeNull();
  });
});
