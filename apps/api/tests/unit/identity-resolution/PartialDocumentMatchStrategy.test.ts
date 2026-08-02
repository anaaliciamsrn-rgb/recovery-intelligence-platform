import { PartialDocumentMatchStrategy } from "../../../src/modules/identity-resolution/infrastructure/PartialDocumentMatchStrategy.js";

const strategy = new PartialDocumentMatchStrategy();

describe("PartialDocumentMatchStrategy", () => {
  it("produz sinal favorável de documento quando os dígitos visíveis coincidem", () => {
    const signals = strategy.compare(
      { documento: "***.982.247-**", nome: "ANA ALICIA" },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "ANA ALICIA" },
    );

    const sinalDocumento = signals.find((s) => s.tipo === "DOCUMENTO_PARCIAL");
    expect(sinalDocumento?.favoravel).toBe(true);
  });

  it("produz sinal desfavorável de documento quando os dígitos visíveis não coincidem", () => {
    const signals = strategy.compare(
      { documento: "***.982.247-**", nome: "ANA ALICIA" },
      { id: "c1", sourceType: "INTERNAL", documento: "11144477735", nome: "ANA ALICIA" },
    );

    const sinalDocumento = signals.find((s) => s.tipo === "DOCUMENTO_PARCIAL");
    expect(sinalDocumento?.favoravel).toBe(false);
  });

  it("produz sinal de nome com base na similaridade", () => {
    const signals = strategy.compare(
      { documento: "***.982.247-**", nome: "ANA ALICIA SOUZA" },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "ANA ALICIA SOUZA" },
    );

    const sinalNome = signals.find((s) => s.tipo === "NOME_SIMILAR");
    expect(sinalNome?.favoravel).toBe(true);
  });

  it("não produz sinal de documento quando a query não está no formato mascarado", () => {
    const signals = strategy.compare(
      { documento: "documento-em-outro-formato", nome: "ANA ALICIA" },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "ANA ALICIA" },
    );

    expect(signals.find((s) => s.tipo === "DOCUMENTO_PARCIAL")).toBeUndefined();
    expect(signals.find((s) => s.tipo === "NOME_SIMILAR")).toBeDefined();
  });

  it("não produz nenhum sinal quando nome é null e documento não é mascarado", () => {
    const signals = strategy.compare(
      { documento: "outro-formato", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "ANA ALICIA" },
    );

    expect(signals).toEqual([]);
  });
});
