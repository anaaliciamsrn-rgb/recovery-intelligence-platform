import {
  ConfidenceScore,
  InvalidConfidenceScoreError,
} from "../../../src/domain/value-objects/ConfidenceScore.js";

describe("ConfidenceScore (shared kernel)", () => {
  it("aceita valores dentro de [0, 1]", () => {
    expect(ConfidenceScore.create(0).toNumber()).toBe(0);
    expect(ConfidenceScore.create(1).toNumber()).toBe(1);
  });

  it("rejeita valores fora de [0, 1]", () => {
    expect(() => ConfidenceScore.create(-0.01)).toThrow(InvalidConfidenceScoreError);
    expect(() => ConfidenceScore.create(1.01)).toThrow(InvalidConfidenceScoreError);
  });

  it("classifica ALTA/MEDIA/BAIXA pelos limiares esperados", () => {
    expect(ConfidenceScore.create(0.8).nivel()).toBe("ALTA");
    expect(ConfidenceScore.create(0.5).nivel()).toBe("MEDIA");
    expect(ConfidenceScore.create(0.49).nivel()).toBe("BAIXA");
  });
});
