import { ClassificacaoRiscoScorer } from "../../../src/modules/classification/domain/services/ClassificacaoRiscoScorer.js";
import { Fator } from "../../../src/modules/classification/domain/value-objects/Fator.js";

describe("ClassificacaoRiscoScorer", () => {
  it("devolve score 0 quando não há fatores", () => {
    expect(ClassificacaoRiscoScorer.score([]).toNumber()).toBe(0);
  });

  it("devolve score 1 quando todos os fatores aumentam risco com peso total", () => {
    const fatores = [
      Fator.create({ nome: "X", peso: 1, direcao: "AUMENTA_RISCO", justificativa: "x" }),
    ];

    expect(ClassificacaoRiscoScorer.score(fatores).toNumber()).toBe(1);
  });

  it("devolve score 0 quando todos os fatores reduzem risco", () => {
    const fatores = [
      Fator.create({ nome: "X", peso: 1, direcao: "REDUZ_RISCO", justificativa: "x" }),
    ];

    expect(ClassificacaoRiscoScorer.score(fatores).toNumber()).toBe(0);
  });

  it("calcula média ponderada quando há fatores nas duas direções", () => {
    const fatores = [
      Fator.create({ nome: "A", peso: 0.4, direcao: "AUMENTA_RISCO", justificativa: "a" }),
      Fator.create({ nome: "B", peso: 0.6, direcao: "REDUZ_RISCO", justificativa: "b" }),
    ];

    expect(ClassificacaoRiscoScorer.score(fatores).toNumber()).toBeCloseTo(0.4);
  });
});
