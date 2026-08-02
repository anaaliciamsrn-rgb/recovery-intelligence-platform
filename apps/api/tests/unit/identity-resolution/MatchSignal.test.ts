import {
  InvalidMatchSignalError,
  MatchSignal,
} from "../../../src/modules/identity-resolution/domain/value-objects/MatchSignal.js";

describe("MatchSignal", () => {
  it("cria um sinal válido", () => {
    const signal = MatchSignal.create({
      tipo: "DOCUMENTO_EXATO",
      peso: 1,
      favoravel: true,
      descricao: "documentos idênticos",
    });

    expect(signal.tipo).toBe("DOCUMENTO_EXATO");
    expect(signal.favoravel).toBe(true);
  });

  it("rejeita peso menor ou igual a zero", () => {
    expect(() =>
      MatchSignal.create({ tipo: "X", peso: 0, favoravel: true, descricao: "x" }),
    ).toThrow(InvalidMatchSignalError);
  });

  it("rejeita peso maior que 1", () => {
    expect(() =>
      MatchSignal.create({ tipo: "X", peso: 1.5, favoravel: true, descricao: "x" }),
    ).toThrow(InvalidMatchSignalError);
  });
});
