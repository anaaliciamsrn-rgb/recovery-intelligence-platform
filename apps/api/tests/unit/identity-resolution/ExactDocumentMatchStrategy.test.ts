import { ExactDocumentMatchStrategy } from "../../../src/modules/identity-resolution/infrastructure/ExactDocumentMatchStrategy.js";

const strategy = new ExactDocumentMatchStrategy();

describe("ExactDocumentMatchStrategy", () => {
  it("produz sinal favorável quando o documento é idêntico (mesmo com formatação diferente)", () => {
    const signals = strategy.compare(
      { documento: "529.982.247-25", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana" },
    );

    expect(signals).toHaveLength(1);
    expect(signals[0]?.favoravel).toBe(true);
  });

  it("produz sinal desfavorável quando o documento difere", () => {
    const signals = strategy.compare(
      { documento: "52998224725", nome: null },
      { id: "c1", sourceType: "INTERNAL", documento: "11144477735", nome: "Outra Pessoa" },
    );

    expect(signals).toHaveLength(1);
    expect(signals[0]?.favoravel).toBe(false);
  });
});
