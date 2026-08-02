import { SnapshotHashService } from "../../../src/modules/dossier-versioning/domain/services/SnapshotHashService.js";
import type { SnapshotContent } from "../../../src/modules/dossier-versioning/domain/value-objects/SnapshotContent.js";

function buildContent(overrides: Partial<SnapshotContent> = {}): SnapshotContent {
  return {
    evidencias: {
      pgfn: { status: "NAO_CONSULTADO" },
      dataJud: { status: "NAO_CONSULTADO" },
      receitaFederal: { status: "NAO_CONSULTADO" },
      portalTransparencia: { status: "NAO_CONSULTADO" },
      cenprot: { status: "NAO_CONSULTADO" },
    },
    classificacao: "BAIXO_RISCO",
    justificativaGeral: "Nenhuma regra pôde ser avaliada",
    fatores: [],
    recomendacoes: [{ canal: "COBRANCA_AMIGAVEL", justificativa: "fallback" }],
    prompt: { structured: { a: 1 }, texto: "texto do prompt" },
    confidenceScore: 0,
    riskScore: 0,
    ...overrides,
  };
}

describe("SnapshotHashService", () => {
  it("produz o mesmo hash para o mesmo conteúdo", () => {
    const conteudo = buildContent();

    expect(SnapshotHashService.compute(conteudo)).toBe(SnapshotHashService.compute(buildContent()));
  });

  it("produz hashes diferentes para conteúdos diferentes", () => {
    const a = SnapshotHashService.compute(buildContent({ riskScore: 0 }));
    const b = SnapshotHashService.compute(buildContent({ riskScore: 1 }));

    expect(a).not.toBe(b);
  });

  it("é independente da ordem de inserção das chaves do objeto", () => {
    const conteudoA = buildContent();
    const conteudoB = {
      riskScore: conteudoA.riskScore,
      confidenceScore: conteudoA.confidenceScore,
      prompt: conteudoA.prompt,
      recomendacoes: conteudoA.recomendacoes,
      fatores: conteudoA.fatores,
      justificativaGeral: conteudoA.justificativaGeral,
      classificacao: conteudoA.classificacao,
      evidencias: conteudoA.evidencias,
    } as SnapshotContent;

    expect(SnapshotHashService.compute(conteudoA)).toBe(SnapshotHashService.compute(conteudoB));
  });

  it("devolve uma string hexadecimal de 64 caracteres (SHA-256)", () => {
    const hash = SnapshotHashService.compute(buildContent());

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
