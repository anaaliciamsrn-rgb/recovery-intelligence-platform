import { SimulationDiffService } from "../../../src/modules/simulation/domain/services/SimulationDiffService.js";
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

describe("SimulationDiffService.detectarMudancas", () => {
  it("detecta evidência adicionada", () => {
    const antes = buildSnapshot();
    const depois = buildSnapshot({
      evidencias: {
        ...antes.evidencias,
        pgfn: { status: "ENCONTRADO", valor: { temPendencia: true } },
      },
    });

    expect(SimulationDiffService.detectarMudancas(antes, depois)).toContain("PGFN adicionada");
  });

  it("detecta evidência removida", () => {
    const antes = buildSnapshot({
      evidencias: {
        pgfn: { status: "ENCONTRADO" },
        dataJud: { status: "NAO_CONSULTADO" },
        receitaFederal: { status: "NAO_CONSULTADO" },
        portalTransparencia: { status: "NAO_CONSULTADO" },
        cenprot: { status: "NAO_CONSULTADO" },
      },
    });
    const depois = buildSnapshot();

    expect(SimulationDiffService.detectarMudancas(antes, depois)).toContain("PGFN removida");
  });

  it("detecta evidência alterada e evidência que permanece", () => {
    const antes = buildSnapshot({
      evidencias: {
        pgfn: { status: "ENCONTRADO", valor: { temPendencia: false } },
        dataJud: { status: "ENCONTRADO", valor: { temProcesso: true } },
        receitaFederal: { status: "NAO_CONSULTADO" },
        portalTransparencia: { status: "NAO_CONSULTADO" },
        cenprot: { status: "NAO_CONSULTADO" },
      },
    });
    const depois = buildSnapshot({
      evidencias: {
        pgfn: { status: "ENCONTRADO", valor: { temPendencia: true } },
        dataJud: { status: "ENCONTRADO", valor: { temProcesso: true } },
        receitaFederal: { status: "NAO_CONSULTADO" },
        portalTransparencia: { status: "NAO_CONSULTADO" },
        cenprot: { status: "NAO_CONSULTADO" },
      },
    });

    const mudancas = SimulationDiffService.detectarMudancas(antes, depois);
    expect(mudancas).toContain("PGFN alterada");
    expect(mudancas).toContain("DataJud permanece");
  });

  it("detecta aumento e queda de confiança e risco", () => {
    const antes = buildSnapshot({ confidenceScore: 0.2, riskScore: 0.8 });
    const depois = buildSnapshot({ confidenceScore: 0.9, riskScore: 0.1 });

    const mudancas = SimulationDiffService.detectarMudancas(antes, depois);
    expect(mudancas).toContain("confiança aumentou");
    expect(mudancas).toContain("risco caiu");
  });

  it("detecta mudança de classificação e de recomendação principal", () => {
    const antes = buildSnapshot({
      classificacao: "ALTO_RISCO",
      recomendacoes: [{ canal: "COBRANCA_JURIDICA", justificativa: "x" }],
    });
    const depois = buildSnapshot({
      classificacao: "MEDIO_RISCO",
      recomendacoes: [{ canal: "WHATSAPP", justificativa: "y" }],
    });

    const mudancas = SimulationDiffService.detectarMudancas(antes, depois);
    expect(mudancas).toContain("classificação mudou de ALTO_RISCO para MEDIO_RISCO");
    expect(mudancas).toContain("recomendação principal mudou de COBRANCA_JURIDICA para WHATSAPP");
  });

  it("não detecta nenhuma mudança quando os estados são idênticos", () => {
    const snapshot = buildSnapshot();

    expect(SimulationDiffService.detectarMudancas(snapshot, buildSnapshot())).toEqual([]);
  });
});
