import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { CalculadoraConfianca } from "../../../src/modules/classification/domain/services/CalculadoraConfianca.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

describe("CalculadoraConfianca", () => {
  it("devolve confiança 1 quando todas as evidências foram respondidas", () => {
    const evidencias = [
      Evidence.encontrada({ valor: "x", fonte: "F", dataConsulta: NOW, confidenceScore: CONF }),
      Evidence.naoEncontrada({ fonte: "F", dataConsulta: NOW, confidenceScore: CONF }),
    ];

    expect(CalculadoraConfianca.calcular(evidencias).toNumber()).toBe(1);
  });

  it("devolve confiança 0 quando nenhuma evidência foi respondida", () => {
    const evidencias = [
      Evidence.naoConsultada({ fonte: "F" }),
      Evidence.comErro({ fonte: "F", dataConsulta: NOW, motivoErro: "x" }),
    ];

    expect(CalculadoraConfianca.calcular(evidencias).toNumber()).toBe(0);
  });

  it("calcula a fração de evidências respondidas sobre o total", () => {
    const evidencias = [
      Evidence.encontrada({ valor: "x", fonte: "F", dataConsulta: NOW, confidenceScore: CONF }),
      Evidence.naoConsultada({ fonte: "F" }),
      Evidence.naoConsultada({ fonte: "F" }),
      Evidence.naoConsultada({ fonte: "F" }),
    ];

    expect(CalculadoraConfianca.calcular(evidencias).toNumber()).toBe(0.25);
  });
});
