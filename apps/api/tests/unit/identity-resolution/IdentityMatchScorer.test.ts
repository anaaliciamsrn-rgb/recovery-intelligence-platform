import { IdentityMatchScorer } from "../../../src/modules/identity-resolution/domain/services/IdentityMatchScorer.js";
import { MatchSignal } from "../../../src/modules/identity-resolution/domain/value-objects/MatchSignal.js";

describe("IdentityMatchScorer", () => {
  it("devolve confiança 0 e NO_MATCH quando não há sinais", () => {
    const { confidenceScore, decision } = IdentityMatchScorer.score([]);

    expect(confidenceScore.toNumber()).toBe(0);
    expect(decision).toBe("NO_MATCH");
  });

  it("devolve confiança 1 e MATCH quando todos os sinais são favoráveis com peso máximo", () => {
    const signals = [MatchSignal.create({ tipo: "X", peso: 1, favoravel: true, descricao: "x" })];

    const { confidenceScore, decision } = IdentityMatchScorer.score(signals);

    expect(confidenceScore.toNumber()).toBe(1);
    expect(decision).toBe("MATCH");
  });

  it("devolve confiança 0 e NO_MATCH quando todos os sinais são desfavoráveis", () => {
    const signals = [MatchSignal.create({ tipo: "X", peso: 1, favoravel: false, descricao: "x" })];

    const { confidenceScore, decision } = IdentityMatchScorer.score(signals);

    expect(confidenceScore.toNumber()).toBe(0);
    expect(decision).toBe("NO_MATCH");
  });

  it("calcula média ponderada quando há sinais favoráveis e desfavoráveis", () => {
    const signals = [
      MatchSignal.create({ tipo: "A", peso: 0.6, favoravel: true, descricao: "a" }),
      MatchSignal.create({ tipo: "B", peso: 0.4, favoravel: false, descricao: "b" }),
    ];

    const { confidenceScore, decision } = IdentityMatchScorer.score(signals);

    expect(confidenceScore.toNumber()).toBeCloseTo(0.6);
    expect(decision).toBe("POSSIBLE_MATCH");
  });
});
