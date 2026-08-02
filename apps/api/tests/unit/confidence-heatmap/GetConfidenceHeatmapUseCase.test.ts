import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { GetConfidenceHeatmapUseCase } from "../../../src/modules/confidence-heatmap/application/use-cases/GetConfidenceHeatmapUseCase.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeVersionSnapshotRepository } from "../dossier-versioning/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

describe("GetConfidenceHeatmapUseCase", () => {
  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = new GetConfidenceHeatmapUseCase(
      new FakeDossieRepository(),
      new ClassificarDossieUseCase(new FakeDossieRepository(), []),
      new FakeVersionSnapshotRepository(),
    );

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("monta o heatmap com confiança histórica a partir dos snapshots de versionamento", async () => {
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
        hash: "hash-1",
      }),
    );

    const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
      new PendenciaFiscalPgfnRule(),
    ]);
    const useCase = new GetConfidenceHeatmapUseCase(
      dossieRepository,
      classificarDossieUseCase,
      versionSnapshotRepository,
    );

    const heatmap = await useCase.execute("d1");

    expect(heatmap.classificacao).toBe("ALTO_RISCO");
    expect(heatmap.fontes.find((f) => f.fonte === "PGFN")?.status).toBe("ENCONTRADO");
    expect(heatmap.fontesAusentes).toEqual(
      expect.arrayContaining(["DATAJUD", "RECEITA_FEDERAL", "PORTAL_TRANSPARENCIA", "CENPROT"]),
    );
    expect(heatmap.confiancaHistorica).toEqual([
      { versao: 1, timestamp: NOW.toISOString(), confidenceScore: 0 },
    ]);
  });
});
