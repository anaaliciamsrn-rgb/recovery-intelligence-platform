import { SimulationSummaryBuilder } from "../../../src/modules/simulation/domain/services/SimulationSummaryBuilder.js";
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
    classificacao: "ALTO_RISCO",
    justificativaGeral: "x",
    fatores: [],
    confidenceScore: 0.4,
    riskScore: 1,
    recomendacoes: [{ canal: "LIGACAO", justificativa: "x" }],
    prompt: { structured: {}, texto: "v1" },
    ...overrides,
  };
}

describe("SimulationSummaryBuilder", () => {
  it("devolve uma mensagem específica quando não há mudanças", () => {
    const snapshot = buildSnapshot();
    expect(SimulationSummaryBuilder.build([], snapshot, snapshot)).toContain(
      "Nenhuma mudança hipotética foi aplicada",
    );
  });

  it("descreve a resolução da PGFN, a queda de risco e a troca de recomendação", () => {
    const antes = buildSnapshot({
      classificacao: "ALTO_RISCO",
      riskScore: 1,
      recomendacoes: [{ canal: "LIGACAO", justificativa: "x" }],
    });
    const depois = buildSnapshot({
      classificacao: "MEDIO_RISCO",
      riskScore: 0.4,
      recomendacoes: [{ canal: "WHATSAPP", justificativa: "y" }],
    });
    const changes = [
      { tipo: "EVIDENCIA" as const, fonte: "PGFN" as const, acao: "REMOVER" as const },
    ];

    const resumo = SimulationSummaryBuilder.build(changes, antes, depois);

    expect(resumo).toContain("a pendência da PGFN seja resolvida");
    expect(resumo).toContain("o risco estimado cai de ALTO para MÉDIO");
    expect(resumo).toContain("permitindo substituir ligação humana por WhatsApp automático");
  });

  it("descreve corretamente quando o risco sobe", () => {
    const antes = buildSnapshot({ classificacao: "BAIXO_RISCO", riskScore: 0 });
    const depois = buildSnapshot({ classificacao: "ALTO_RISCO", riskScore: 1 });
    const changes = [
      {
        tipo: "EVIDENCIA" as const,
        fonte: "DATAJUD" as const,
        acao: "SUBSTITUIR" as const,
        status: "ENCONTRADO" as const,
      },
    ];

    expect(SimulationSummaryBuilder.build(changes, antes, depois)).toContain(
      "o risco estimado sobe de BAIXO para ALTO",
    );
  });

  it("descreve permanência de risco e de recomendação quando nada muda de fato", () => {
    const antes = buildSnapshot();
    const depois = buildSnapshot();
    const changes = [{ tipo: "CONFIANCA_OVERRIDE" as const, valor: 0.4 }];

    const resumo = SimulationSummaryBuilder.build(changes, antes, depois);

    expect(resumo).toContain("o risco estimado permanece em ALTO");
    expect(resumo).toContain("mantendo a recomendação de ligação humana");
  });
});
