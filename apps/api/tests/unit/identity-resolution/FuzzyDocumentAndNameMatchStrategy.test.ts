import { FuzzyDocumentAndNameMatchStrategy } from "../../../src/modules/identity-resolution/infrastructure/FuzzyDocumentAndNameMatchStrategy.js";

const strategy = new FuzzyDocumentAndNameMatchStrategy();

describe("FuzzyDocumentAndNameMatchStrategy", () => {
  it("produz alta confiança quando documento e nome coincidem exatamente", () => {
    const signals = strategy.compare(
      { documento: "52998224725", nome: "Ana Silva" },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana Silva" },
    );

    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.favoravel)).toBe(true);
  });

  it("produz sinal de documento desfavorável só com um dígito diferente, mas não descarta o candidato", () => {
    const signals = strategy.compare(
      { documento: "52998224725", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224720", nome: "Ana Silva" },
    );

    const sinalDocumento = signals.find((s) => s.tipo === "DOCUMENTO_SIMILAR");
    expect(sinalDocumento?.favoravel).toBe(true);
    expect(sinalDocumento?.descricao).toContain("%");
  });

  it("produz sinal de nome desfavorável quando o nome é bem diferente", () => {
    const signals = strategy.compare(
      { documento: "52998224725", nome: "Zeca Completamente Diferente" },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana Silva" },
    );

    const sinalNome = signals.find((s) => s.tipo === "NOME_SIMILAR");
    expect(sinalNome?.favoravel).toBe(false);
  });

  it("não produz sinal de nome quando a query não informa nome", () => {
    const signals = strategy.compare(
      { documento: "52998224725", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana Silva" },
    );

    expect(signals.find((s) => s.tipo === "NOME_SIMILAR")).toBeUndefined();
  });

  it("dá similaridade de documento zero quando não há nenhum dígito em comum", () => {
    const signals = strategy.compare(
      { documento: "11111111111", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "22222222222", nome: "Ana Silva" },
    );

    const sinalDocumento = signals.find((s) => s.tipo === "DOCUMENTO_SIMILAR");
    expect(sinalDocumento?.favoravel).toBe(false);
    expect(sinalDocumento?.descricao).toContain("0%");
  });
});
