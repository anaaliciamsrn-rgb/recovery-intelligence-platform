import { CPF, InvalidCpfError } from "../../../src/modules/party/domain/value-objects/CPF.js";

describe("CPF", () => {
  it("aceita um CPF com dígitos verificadores válidos", () => {
    const cpf = CPF.create("52998224725");

    expect(cpf.toString()).toBe("52998224725");
  });

  it("normaliza formatação (pontos e hífen) antes de validar", () => {
    const cpf = CPF.create("529.982.247-25");

    expect(cpf.toString()).toBe("52998224725");
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(() => CPF.create("52998224726")).toThrow(InvalidCpfError);
  });

  it("rejeita CPF com quantidade de dígitos diferente de 11", () => {
    expect(() => CPF.create("123")).toThrow(InvalidCpfError);
  });

  it("rejeita sequências com todos os dígitos iguais", () => {
    expect(() => CPF.create("11111111111")).toThrow(InvalidCpfError);
  });

  it("compara por valor normalizado", () => {
    const a = CPF.create("529.982.247-25");
    const b = CPF.create("52998224725");

    expect(a.equals(b)).toBe(true);
  });
});
