import { SimulationImpactAnalyzer } from "../../../src/modules/simulation/domain/services/SimulationImpactAnalyzer.js";
import type { SimulationStateSnapshot } from "../../../src/modules/simulation/domain/value-objects/SimulationStateSnapshot.js";

function buildSnapshot(overrides: Partial<SimulationStateSnapshot> = {}): SimulationStateSnapshot {
  return {
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
    confidenceScore: 0,
    riskScore: 0,
    recomendacoes: [{ canal: "COBRANCA_AMIGAVEL", justificativa: "fallback" }],
    prompt: { structured: {}, texto: "v1" },
    ...overrides,
  };
}

describe("SimulationImpactAnalyzer", () => {
  it("explica que uma evidência PGFN adicionada ativou a regra correspondente", () => {
    const antes = buildSnapshot();
    const depois = buildSnapshot({
      classificacao: "ALTO_RISCO",
      fatores: [
        {
          nome: "Pendência Fiscal (PGFN)",
          peso: 0.4,
          fonte: "PGFN",
          direcao: "AUMENTA_RISCO",
          justificativa: "x",
        },
      ],
    });
    const change = {
      tipo: "EVIDENCIA" as const,
      fonte: "PGFN" as const,
      acao: "SUBSTITUIR" as const,
      status: "ENCONTRADO" as const,
    };

    const [impacto] = SimulationImpactAnalyzer.analyze([change], antes, depois);

    expect(impacto?.afetouRisco).toBe(true);
    expect(impacto?.afetouClassificacao).toBe(true);
    expect(impacto?.descricao).toContain("ativando a regra");
  });

  it("explica que remover uma evidência desativou a regra correspondente", () => {
    const antes = buildSnapshot({
      fatores: [
        {
          nome: "Pendência Fiscal (PGFN)",
          peso: 0.4,
          fonte: "PGFN",
          direcao: "AUMENTA_RISCO",
          justificativa: "x",
        },
      ],
    });
    const depois = buildSnapshot();
    const change = { tipo: "EVIDENCIA" as const, fonte: "PGFN" as const, acao: "REMOVER" as const };

    const [impacto] = SimulationImpactAnalyzer.analyze([change], antes, depois);

    expect(impacto?.descricao).toContain("desativando a regra");
  });

  it("informa que uma fonte sem regra associada não influencia o risco", () => {
    const antes = buildSnapshot();
    const depois = buildSnapshot();
    const change = {
      tipo: "EVIDENCIA" as const,
      fonte: "CENPROT" as const,
      acao: "SUBSTITUIR" as const,
      status: "ENCONTRADO" as const,
    };

    const [impacto] = SimulationImpactAnalyzer.analyze([change], antes, depois);

    expect(impacto?.afetouRisco).toBe(false);
    expect(impacto?.descricao).toContain("não tem nenhuma regra de classificação associada");
  });

  it("explica um override de confiança", () => {
    const antes = buildSnapshot({ confidenceScore: 0.2 });
    const depois = buildSnapshot({ confidenceScore: 0.9 });
    const change = { tipo: "CONFIANCA_OVERRIDE" as const, valor: 0.9 };

    const [impacto] = SimulationImpactAnalyzer.analyze([change], antes, depois);

    expect(impacto?.afetouConfianca).toBe(true);
    expect(impacto?.afetouRisco).toBe(false);
    expect(impacto?.descricao).toContain("sobrescrita manualmente");
  });

  it("explica um override de classificação", () => {
    const antes = buildSnapshot({ classificacao: "ALTO_RISCO" });
    const depois = buildSnapshot({ classificacao: "MEDIO_RISCO" });
    const change = { tipo: "CLASSIFICACAO_OVERRIDE" as const, valor: "MEDIO_RISCO" as const };

    const [impacto] = SimulationImpactAnalyzer.analyze([change], antes, depois);

    expect(impacto?.afetouClassificacao).toBe(true);
    expect(impacto?.descricao).toContain("ignorando o motor de regras");
  });
});
