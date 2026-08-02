import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import {
  deserializeEvidence,
  serializeEvidence,
} from "../../../src/modules/dossie/infrastructure/persistence/evidenceSerializer.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("evidenceSerializer", () => {
  it("faz round-trip de uma evidência ENCONTRADO sem perder informação", () => {
    const original = Evidence.encontrada({
      valor: { situacao: "ATIVA" },
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      confidenceScore: ConfidenceScore.create(0.75),
    });

    const roundTripped = deserializeEvidence(serializeEvidence(original));

    expect(roundTripped.status).toBe("ENCONTRADO");
    if (roundTripped.status !== "ENCONTRADO") throw new Error("esperava ENCONTRADO");
    expect(roundTripped.valor).toEqual({ situacao: "ATIVA" });
    expect(roundTripped.dataConsulta).toEqual(NOW);
    expect(roundTripped.confidenceScore.toNumber()).toBe(0.75);
  });

  it("faz round-trip de uma evidência NAO_CONSULTADO (sem data/confiança)", () => {
    const original = Evidence.naoConsultada({ fonte: "CENPROT" });

    const roundTripped = deserializeEvidence(serializeEvidence(original));

    expect(roundTripped.status).toBe("NAO_CONSULTADO");
    expect("dataConsulta" in roundTripped).toBe(false);
  });

  it("faz round-trip de uma evidência ERRO_CONSULTA preservando o motivo", () => {
    const original = Evidence.comErro({ fonte: "PGFN", dataConsulta: NOW, motivoErro: "timeout" });

    const roundTripped = deserializeEvidence(serializeEvidence(original));

    expect(roundTripped.status).toBe("ERRO_CONSULTA");
    if (roundTripped.status !== "ERRO_CONSULTA") throw new Error("esperava ERRO_CONSULTA");
    expect(roundTripped.motivoErro).toBe("timeout");
  });
});
