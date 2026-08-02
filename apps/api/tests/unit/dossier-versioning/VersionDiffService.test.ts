import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { VersionDiffService } from "../../../src/modules/dossier-versioning/domain/services/VersionDiffService.js";
import type {
  DossieEvidenciasSnapshot,
  FatorSnapshot,
  RecomendacaoSnapshotItem,
} from "../../../src/modules/dossier-versioning/domain/value-objects/SnapshotContent.js";

const NOW = new Date("2026-01-01T00:00:00Z");

const EVIDENCIAS_VAZIAS: DossieEvidenciasSnapshot = {
  pgfn: { status: "NAO_CONSULTADO" },
  dataJud: { status: "NAO_CONSULTADO" },
  receitaFederal: { status: "NAO_CONSULTADO" },
  portalTransparencia: { status: "NAO_CONSULTADO" },
  cenprot: { status: "NAO_CONSULTADO" },
};

function buildSnapshot(overrides: Partial<Parameters<typeof VersionSnapshot.create>[0]> = {}) {
  return VersionSnapshot.create({
    id: "snap-1",
    dossieId: "dossie-1",
    versao: 1,
    timestamp: NOW,
    usuarioId: "user-1",
    evidencias: EVIDENCIAS_VAZIAS,
    classificacao: "BAIXO_RISCO",
    justificativaGeral: "Nenhuma regra pôde ser avaliada",
    fatores: [],
    recomendacoes: [],
    prompt: { structured: {}, texto: "v1" },
    confidenceScore: 0,
    riskScore: 0,
    hash: "hash-1",
    ...overrides,
  });
}

describe("VersionDiffService", () => {
  it("identifica evidência adicionada quando uma fonte deixa de estar NAO_CONSULTADO", () => {
    const v1 = buildSnapshot({ versao: 1 });
    const v2 = buildSnapshot({
      versao: 2,
      evidencias: {
        ...EVIDENCIAS_VAZIAS,
        pgfn: {
          status: "ENCONTRADO",
          valor: { temPendencia: true },
          dataConsulta: NOW.toISOString(),
          confidenceScore: 0.9,
        },
      },
    });

    const diff = VersionDiffService.diff(v1, v2);

    expect(diff.evidencias).toEqual([{ fonte: "pgfn", tipo: "ADICIONADA" }]);
  });

  it("identifica evidência alterada quando o conteúdo muda mas a fonte já estava consultada", () => {
    const evidenciaA = {
      pgfn: {
        status: "ENCONTRADO" as const,
        valor: { temPendencia: false },
        dataConsulta: NOW.toISOString(),
        confidenceScore: 0.9,
      },
    };
    const evidenciaB = {
      pgfn: {
        status: "ENCONTRADO" as const,
        valor: { temPendencia: true },
        dataConsulta: NOW.toISOString(),
        confidenceScore: 0.9,
      },
    };
    const v1 = buildSnapshot({ versao: 1, evidencias: { ...EVIDENCIAS_VAZIAS, ...evidenciaA } });
    const v2 = buildSnapshot({ versao: 2, evidencias: { ...EVIDENCIAS_VAZIAS, ...evidenciaB } });

    const diff = VersionDiffService.diff(v1, v2);

    expect(diff.evidencias).toEqual([{ fonte: "pgfn", tipo: "ALTERADA" }]);
  });

  it("não lista nenhuma evidência quando nada muda", () => {
    const v1 = buildSnapshot({ versao: 1 });
    const v2 = buildSnapshot({ versao: 2 });

    expect(VersionDiffService.diff(v1, v2).evidencias).toEqual([]);
  });

  it("identifica fator adicionado e removido", () => {
    const fatorA: FatorSnapshot = {
      nome: "Fator A",
      peso: 0.4,
      direcao: "AUMENTA_RISCO",
      justificativa: "x",
    };
    const fatorB: FatorSnapshot = {
      nome: "Fator B",
      peso: 0.3,
      direcao: "REDUZ_RISCO",
      justificativa: "y",
    };
    const v1 = buildSnapshot({ versao: 1, fatores: [fatorA] });
    const v2 = buildSnapshot({ versao: 2, fatores: [fatorB] });

    const diff = VersionDiffService.diff(v1, v2);

    expect(diff.fatores).toEqual(
      expect.arrayContaining([
        { nome: "Fator A", tipo: "REMOVIDA" },
        { nome: "Fator B", tipo: "ADICIONADA" },
      ]),
    );
  });

  it("identifica recomendação adicionada e removida", () => {
    const recA: RecomendacaoSnapshotItem = { canal: "WHATSAPP", justificativa: "x" };
    const recB: RecomendacaoSnapshotItem = { canal: "COBRANCA_JURIDICA", justificativa: "y" };
    const v1 = buildSnapshot({ versao: 1, recomendacoes: [recA] });
    const v2 = buildSnapshot({ versao: 2, recomendacoes: [recB] });

    const diff = VersionDiffService.diff(v1, v2);

    expect(diff.recomendacoes).toEqual(
      expect.arrayContaining([
        { canal: "WHATSAPP", tipo: "REMOVIDA" },
        { canal: "COBRANCA_JURIDICA", tipo: "ADICIONADA" },
      ]),
    );
  });

  it("identifica mudança de classificação, score de risco e confiança", () => {
    const v1 = buildSnapshot({
      versao: 1,
      classificacao: "BAIXO_RISCO",
      riskScore: 0,
      confidenceScore: 0,
    });
    const v2 = buildSnapshot({
      versao: 2,
      classificacao: "ALTO_RISCO",
      riskScore: 1,
      confidenceScore: 0.2,
    });

    const diff = VersionDiffService.diff(v1, v2);

    expect(diff.classificacao).toEqual({
      anterior: "BAIXO_RISCO",
      atual: "ALTO_RISCO",
      mudou: true,
    });
    expect(diff.riskScore).toEqual({ anterior: 0, atual: 1, mudou: true });
    expect(diff.confidenceScore).toEqual({ anterior: 0, atual: 0.2, mudou: true });
  });

  it("identifica mudança de prompt", () => {
    const v1 = buildSnapshot({ versao: 1, prompt: { structured: {}, texto: "antes" } });
    const v2 = buildSnapshot({ versao: 2, prompt: { structured: {}, texto: "depois" } });

    expect(VersionDiffService.diff(v1, v2).promptMudou).toBe(true);
  });

  it("lança erro ao comparar versões de dossiês diferentes", () => {
    const v1 = buildSnapshot({ versao: 1, dossieId: "dossie-1" });
    const v2 = buildSnapshot({ versao: 2, dossieId: "dossie-2" });

    expect(() => VersionDiffService.diff(v1, v2)).toThrow();
  });
});
