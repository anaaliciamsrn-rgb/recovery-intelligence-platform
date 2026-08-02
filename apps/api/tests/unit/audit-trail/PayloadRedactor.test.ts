import { PayloadRedactor } from "../../../src/modules/audit-trail/domain/services/PayloadRedactor.js";

describe("PayloadRedactor", () => {
  it("redige campos sensíveis no nível raiz", () => {
    const resultado = PayloadRedactor.redact({ email: "a@b.com", password: "segredo123" });

    expect(resultado).toEqual({ email: "a@b.com", password: "[REDACTED]" });
  });

  it("é insensível a caixa nos nomes dos campos sensíveis", () => {
    const resultado = PayloadRedactor.redact({
      AccessToken: "abc",
      RefreshToken: "def",
      SENHA: "123",
    });

    expect(resultado).toEqual({
      AccessToken: "[REDACTED]",
      RefreshToken: "[REDACTED]",
      SENHA: "[REDACTED]",
    });
  });

  it("redige recursivamente dentro de objetos aninhados", () => {
    const resultado = PayloadRedactor.redact({
      request: { email: "a@b.com", password: "segredo" },
      response: { user: { id: "1", token: "xyz" } },
    });

    expect(resultado).toEqual({
      request: { email: "a@b.com", password: "[REDACTED]" },
      response: { user: { id: "1", token: "[REDACTED]" } },
    });
  });

  it("redige dentro de arrays", () => {
    const resultado = PayloadRedactor.redact([{ password: "a" }, { password: "b" }]);

    expect(resultado).toEqual([{ password: "[REDACTED]" }, { password: "[REDACTED]" }]);
  });

  it("preserva valores primitivos e null sem alteração", () => {
    expect(PayloadRedactor.redact("texto")).toBe("texto");
    expect(PayloadRedactor.redact(42)).toBe(42);
    expect(PayloadRedactor.redact(null)).toBeNull();
    expect(PayloadRedactor.redact(undefined)).toBeUndefined();
  });

  it("não redige CPF/CNPJ — só segredos de credencial/token", () => {
    const resultado = PayloadRedactor.redact({ documento: "52998224725", nome: "Fulano" });

    expect(resultado).toEqual({ documento: "52998224725", nome: "Fulano" });
  });
});
