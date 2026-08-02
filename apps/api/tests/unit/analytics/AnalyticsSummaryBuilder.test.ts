import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { AnalyticsSummaryBuilder } from "../../../src/modules/analytics/domain/services/AnalyticsSummaryBuilder.js";
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
    id: overrides.id ?? "snap-1",
    dossieId: overrides.dossieId ?? "d1",
    versao: 1,
    timestamp: new Date("2026-01-15T00:00:00Z"),
    usuarioId: null,
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

describe("AnalyticsSummaryBuilder", () => {
  it("agrega distribuição de risco, canais e fatores mais frequentes", () => {
    const snapshots = [
      buildSnapshot({
        id: "s1",
        dossieId: "d1",
        classificacao: "ALTO_RISCO",
        riskScore: 1,
        confidenceScore: 0.9,
        recomendacoes: [{ canal: "COBRANCA_JURIDICA", justificativa: "x" }],
        fatores: [
          {
            nome: "Pendência Fiscal (PGFN)",
            peso: 0.4,
            direcao: "AUMENTA_RISCO",
            justificativa: "x",
          },
        ],
      }),
      buildSnapshot({
        id: "s2",
        dossieId: "d2",
        classificacao: "ALTO_RISCO",
        riskScore: 0.8,
        confidenceScore: 0.7,
        recomendacoes: [{ canal: "COBRANCA_JURIDICA", justificativa: "y" }],
        fatores: [
          {
            nome: "Pendência Fiscal (PGFN)",
            peso: 0.4,
            direcao: "AUMENTA_RISCO",
            justificativa: "y",
          },
        ],
      }),
      buildSnapshot({
        id: "s3",
        dossieId: "d3",
        classificacao: "BAIXO_RISCO",
        riskScore: 0,
        confidenceScore: 0.1,
        recomendacoes: [{ canal: "WHATSAPP", justificativa: "z" }],
        fatores: [],
      }),
    ];

    const resumo = AnalyticsSummaryBuilder.build(snapshots, snapshots, {
      pessoas: 10,
      empresas: 5,
      importacoes: 2,
    });

    expect(resumo.totalPessoas).toBe(10);
    expect(resumo.totalEmpresas).toBe(5);
    expect(resumo.totalDossiesAnalisados).toBe(3);
    expect(resumo.totalImportacoes).toBe(2);
    expect(resumo.distribuicaoRisco).toEqual({ ALTO_RISCO: 2, BAIXO_RISCO: 1 });
    expect(resumo.canaisMaisRecomendados[0]).toEqual({ canal: "COBRANCA_JURIDICA", total: 2 });
    expect(resumo.fatoresMaisFrequentes[0]).toEqual({ nome: "Pendência Fiscal (PGFN)", total: 2 });
    expect(resumo.scoreMedio).toBeCloseTo(0.6);
    expect(resumo.confiancaMedia).toBeCloseTo((0.9 + 0.7 + 0.1) / 3);
  });

  it("calcula o percentual respondido por fonte", () => {
    const respondida = buildSnapshot({
      id: "s1",
      dossieId: "d1",
      evidencias: { ...EVIDENCIAS_VAZIAS, pgfn: { status: "ENCONTRADO" } },
    });
    const naoRespondida = buildSnapshot({ id: "s2", dossieId: "d2" });

    const resumo = AnalyticsSummaryBuilder.build([respondida, naoRespondida], [], {
      pessoas: 0,
      empresas: 0,
      importacoes: 0,
    });

    expect(resumo.metricasPorFonte.find((m) => m.fonte === "pgfn")?.percentualRespondida).toBe(50);
    expect(resumo.metricasPorFonte.find((m) => m.fonte === "dataJud")?.percentualRespondida).toBe(
      0,
    );
  });

  it("agrupa a evolução temporal por mês a partir de todas as versões, não só a mais recente", () => {
    const jan = buildSnapshot({
      id: "s1",
      dossieId: "d1",
      timestamp: new Date("2026-01-10T00:00:00Z"),
      riskScore: 0.2,
    });
    const fev = buildSnapshot({
      id: "s2",
      dossieId: "d1",
      timestamp: new Date("2026-02-10T00:00:00Z"),
      riskScore: 0.8,
    });

    const resumo = AnalyticsSummaryBuilder.build([fev], [jan, fev], {
      pessoas: 0,
      empresas: 0,
      importacoes: 0,
    });

    expect(resumo.evolucaoTemporal).toEqual([
      { periodo: "2026-01", scoreMedio: 0.2, confiancaMedia: 0, totalVersoes: 1 },
      { periodo: "2026-02", scoreMedio: 0.8, confiancaMedia: 0, totalVersoes: 1 },
    ]);
  });

  it("devolve estatísticas zeradas quando não há nenhum snapshot", () => {
    const resumo = AnalyticsSummaryBuilder.build([], [], {
      pessoas: 0,
      empresas: 0,
      importacoes: 0,
    });

    expect(resumo.scoreMedio).toBe(0);
    expect(resumo.confiancaMedia).toBe(0);
    expect(resumo.distribuicaoRisco).toEqual({});
    expect(resumo.canaisMaisRecomendados).toEqual([]);
    expect(resumo.evolucaoTemporal).toEqual([]);
  });
});
