import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { TimelineVersionBuilder } from "../../../src/modules/dossier-versioning/domain/services/TimelineVersionBuilder.js";
import type { DossieEvidenciasSnapshot } from "../../../src/modules/dossier-versioning/domain/value-objects/SnapshotContent.js";

const EVIDENCIAS_VAZIAS: DossieEvidenciasSnapshot = {
  pgfn: { status: "NAO_CONSULTADO" },
  dataJud: { status: "NAO_CONSULTADO" },
  receitaFederal: { status: "NAO_CONSULTADO" },
  portalTransparencia: { status: "NAO_CONSULTADO" },
  cenprot: { status: "NAO_CONSULTADO" },
};

function buildSnapshot(overrides: Partial<Parameters<typeof VersionSnapshot.create>[0]> = {}) {
  return VersionSnapshot.create({
    id: `snap-${overrides.versao ?? 1}`,
    dossieId: "dossie-1",
    versao: 1,
    timestamp: new Date("2026-01-01T00:00:00Z"),
    usuarioId: "user-1",
    evidencias: EVIDENCIAS_VAZIAS,
    classificacao: "BAIXO_RISCO",
    justificativaGeral: "x",
    fatores: [],
    recomendacoes: [],
    prompt: { structured: {}, texto: "v1" },
    confidenceScore: 0,
    riskScore: 0,
    hash: "hash",
    ...overrides,
  });
}

describe("TimelineVersionBuilder", () => {
  it("a primeira versão nunca tem resumo de mudanças", () => {
    const timeline = TimelineVersionBuilder.build([buildSnapshot({ versao: 1 })]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.resumoMudancas).toEqual([]);
  });

  it("versões seguintes resumem a diferença contra a versão imediatamente anterior", () => {
    const v1 = buildSnapshot({ versao: 1, riskScore: 0, classificacao: "BAIXO_RISCO" });
    const v2 = buildSnapshot({
      versao: 2,
      riskScore: 1,
      classificacao: "ALTO_RISCO",
      evidencias: {
        ...EVIDENCIAS_VAZIAS,
        pgfn: {
          status: "ENCONTRADO",
          valor: { temPendencia: true },
          dataConsulta: "2026-01-02T00:00:00Z",
          confidenceScore: 0.9,
        },
      },
    });

    const timeline = TimelineVersionBuilder.build([v1, v2]);

    expect(timeline[1]?.resumoMudancas).toEqual(
      expect.arrayContaining([
        "Evidência PGFN adicionada",
        "Classificação de risco mudou de BAIXO_RISCO para ALTO_RISCO",
        "Score de risco mudou de 0.00 para 1.00",
      ]),
    );
  });

  it("mantém a ordem, o hash e o usuário de cada entrada", () => {
    const v1 = buildSnapshot({ versao: 1, usuarioId: "user-1", hash: "hash-1" });
    const v2 = buildSnapshot({ versao: 2, usuarioId: "user-2", hash: "hash-2" });

    const timeline = TimelineVersionBuilder.build([v1, v2]);

    expect(timeline.map((entrada) => entrada.versao)).toEqual([1, 2]);
    expect(timeline[0]?.usuarioId).toBe("user-1");
    expect(timeline[1]?.hash).toBe("hash-2");
  });
});
