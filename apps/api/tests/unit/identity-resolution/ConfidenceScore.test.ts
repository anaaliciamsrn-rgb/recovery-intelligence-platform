import {
  ConfidenceScore,
  InvalidConfidenceScoreError,
} from "../../../src/modules/identity-resolution/domain/value-objects/ConfidenceScore.js";

describe("ConfidenceScore", () => {
  it("aceita valores dentro de [0, 1]", () => {
    expect(ConfidenceScore.create(0).toNumber()).toBe(0);
    expect(ConfidenceScore.create(1).toNumber()).toBe(1);
    expect(ConfidenceScore.create(0.5).toNumber()).toBe(0.5);
  });

  it("rejeita valores fora de [0, 1]", () => {
    expect(() => ConfidenceScore.create(-0.01)).toThrow(InvalidConfidenceScoreError);
    expect(() => ConfidenceScore.create(1.01)).toThrow(InvalidConfidenceScoreError);
  });

  it("classifica ALTA a partir de 0.8", () => {
    expect(ConfidenceScore.create(0.8).nivel()).toBe("ALTA");
    expect(ConfidenceScore.create(1).nivel()).toBe("ALTA");
  });

  it("classifica MEDIA entre 0.5 e 0.8 (exclusive)", () => {
    expect(ConfidenceScore.create(0.5).nivel()).toBe("MEDIA");
    expect(ConfidenceScore.create(0.79).nivel()).toBe("MEDIA");
  });

  it("classifica BAIXA abaixo de 0.5", () => {
    expect(ConfidenceScore.create(0).nivel()).toBe("BAIXA");
    expect(ConfidenceScore.create(0.49).nivel()).toBe("BAIXA");
  });
});
