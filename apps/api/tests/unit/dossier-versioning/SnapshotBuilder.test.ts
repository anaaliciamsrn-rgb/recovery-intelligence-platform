import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { SnapshotBuilder } from "../../../src/modules/dossier-versioning/application/services/SnapshotBuilder.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { BuildPromptUseCase } from "../../../src/modules/prompt-builder/application/use-cases/BuildPromptUseCase.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildSnapshotBuilder(
  dossieRepository: FakeDossieRepository,
  pessoaRepository: FakePessoaRepository,
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

  return new SnapshotBuilder(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
  );
}

describe("SnapshotBuilder", () => {
  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const builder = buildSnapshotBuilder(new FakeDossieRepository(), new FakePessoaRepository());

    await expect(builder.build("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("congela evidências, classificação, fatores, recomendações e prompt do estado atual do dossiê", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
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
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);

    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p1",
        cpf: CPF.create("52998224725"),
        nome: "Sujeito de Teste",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    const builder = buildSnapshotBuilder(dossieRepository, pessoaRepository);

    const content = await builder.build("d1");

    expect(content.classificacao).toBe("ALTO_RISCO");
    expect(content.riskScore).toBe(1);
    expect(content.fatores).toHaveLength(1);
    expect(content.fatores[0]?.nome).toBe("Pendência Fiscal (PGFN)");
    expect(content.evidencias.pgfn.status).toBe("ENCONTRADO");
    expect(content.evidencias.pgfn.valor).toEqual({ temPendencia: true });
    expect(content.evidencias.dataJud.status).toBe("NAO_CONSULTADO");
    expect(content.recomendacoes.length).toBeGreaterThan(0);
    expect(content.prompt.texto).toContain("Sujeito de Teste");
    expect(typeof content.prompt.structured).toBe("object");
  });
});
