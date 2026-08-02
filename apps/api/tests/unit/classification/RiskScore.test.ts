import {
  InvalidRiskScoreError,
  RiskScore,
} from "../../../src/modules/classification/domain/value-objects/RiskScore.js";

describe("RiskScore", () => {
  it("aceita valores dentro de [0, 1]", () => {
    expect(RiskScore.create(0).toNumber()).toBe(0);
    expect(RiskScore.create(1).toNumber()).toBe(1);
  });

  it("rejeita valores fora de [0, 1]", () => {
    expect(() => RiskScore.create(-0.01)).toThrow(InvalidRiskScoreError);
    expect(() => RiskScore.create(1.01)).toThrow(InvalidRiskScoreError);
  });

  it("classifica ALTO_RISCO a partir de 0.66", () => {
    expect(RiskScore.create(0.66).classe()).toBe("ALTO_RISCO");
  });

  it("classifica MEDIO_RISCO entre 0.33 e 0.66 (exclusive)", () => {
    expect(RiskScore.create(0.33).classe()).toBe("MEDIO_RISCO");
    expect(RiskScore.create(0.65).classe()).toBe("MEDIO_RISCO");
  });

  it("classifica BAIXO_RISCO abaixo de 0.33", () => {
    expect(RiskScore.create(0).classe()).toBe("BAIXO_RISCO");
    expect(RiskScore.create(0.32).classe()).toBe("BAIXO_RISCO");
  });
});
