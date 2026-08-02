import { CNPJ, InvalidCnpjError } from "../../../src/modules/party/domain/value-objects/CNPJ.js";

describe("CNPJ", () => {
  it("aceita um CNPJ com dígitos verificadores válidos", () => {
    const cnpj = CNPJ.create("11222333000181");

    expect(cnpj.toString()).toBe("11222333000181");
  });

  it("normaliza formatação (pontos, barra e hífen) antes de validar", () => {
    const cnpj = CNPJ.create("11.222.333/0001-81");

    expect(cnpj.toString()).toBe("11222333000181");
  });

  it("rejeita CNPJ com dígito verificador incorreto", () => {
    expect(() => CNPJ.create("11222333000182")).toThrow(InvalidCnpjError);
  });

  it("rejeita CNPJ com quantidade de dígitos diferente de 14", () => {
    expect(() => CNPJ.create("123")).toThrow(InvalidCnpjError);
  });

  it("rejeita sequências com todos os dígitos iguais", () => {
    expect(() => CNPJ.create("11111111111111")).toThrow(InvalidCnpjError);
  });

  it("compara por valor normalizado", () => {
    const a = CNPJ.create("11.222.333/0001-81");
    const b = CNPJ.create("11222333000181");

    expect(a.equals(b)).toBe(true);
  });
});
