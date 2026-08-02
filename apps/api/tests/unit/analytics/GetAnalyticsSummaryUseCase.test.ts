import { GetAnalyticsSummaryUseCase } from "../../../src/modules/analytics/application/use-cases/GetAnalyticsSummaryUseCase.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { FakeVersionSnapshotRepository } from "../dossier-versioning/fakes.js";
import { FakeImportBatchRepository } from "../import/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("GetAnalyticsSummaryUseCase", () => {
  it("agrega totais reais de pessoas, empresas, importações e dossiês versionados", async () => {
    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p1",
        cpf: CPF.create("52998224725"),
        nome: "Fulano",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    const importBatchRepository = new FakeImportBatchRepository();
    importBatchRepository.seed(
      ImportBatch.iniciar({
        id: "b1",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "x.xlsx",
        totalLinhas: 1,
        now: NOW,
      }),
    );

    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(
      VersionSnapshot.create({
        id: "s1",
        dossieId: "d1",
        versao: 1,
        timestamp: NOW,
        usuarioId: null,
        evidencias: {
          pgfn: { status: "NAO_CONSULTADO" },
          dataJud: { status: "NAO_CONSULTADO" },
          receitaFederal: { status: "NAO_CONSULTADO" },
          portalTransparencia: { status: "NAO_CONSULTADO" },
          cenprot: { status: "NAO_CONSULTADO" },
        },
        classificacao: "BAIXO_RISCO",
        justificativaGeral: "x",
        fatores: [],
        recomendacoes: [],
        prompt: { structured: {}, texto: "v1" },
        confidenceScore: 0,
        riskScore: 0,
        hash: "hash",
      }),
    );

    const useCase = new GetAnalyticsSummaryUseCase(
      pessoaRepository,
      new FakeEmpresaRepository(),
      importBatchRepository,
      versionSnapshotRepository,
    );
    const resumo = await useCase.execute();

    expect(resumo.totalPessoas).toBe(1);
    expect(resumo.totalEmpresas).toBe(0);
    expect(resumo.totalImportacoes).toBe(1);
    expect(resumo.totalDossiesAnalisados).toBe(1);
  });
});
