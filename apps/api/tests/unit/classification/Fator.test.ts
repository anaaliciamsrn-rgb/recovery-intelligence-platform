import {
  Fator,
  InvalidFatorError,
} from "../../../src/modules/classification/domain/value-objects/Fator.js";

describe("Fator", () => {
  it("cria um fator válido", () => {
    const fator = Fator.create({
      nome: "X",
      peso: 0.5,
      direcao: "AUMENTA_RISCO",
      justificativa: "x",
    });

    expect(fator.nome).toBe("X");
    expect(fator.direcao).toBe("AUMENTA_RISCO");
  });

  it("rejeita peso menor ou igual a zero", () => {
    expect(() =>
      Fator.create({ nome: "X", peso: 0, direcao: "AUMENTA_RISCO", justificativa: "x" }),
    ).toThrow(InvalidFatorError);
  });

  it("rejeita peso maior que 1", () => {
    expect(() =>
      Fator.create({ nome: "X", peso: 1.1, direcao: "AUMENTA_RISCO", justificativa: "x" }),
    ).toThrow(InvalidFatorError);
  });
});
