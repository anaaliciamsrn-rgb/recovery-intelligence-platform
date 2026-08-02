import { nameSimilarity } from "../../../src/modules/identity-resolution/infrastructure/nameSimilarity.js";

describe("nameSimilarity", () => {
  it("devolve 1 para nomes idênticos", () => {
    expect(nameSimilarity("MARIA DA SILVA", "MARIA DA SILVA")).toBe(1);
  });

  it("devolve 0 para nomes completamente diferentes", () => {
    expect(nameSimilarity("MARIA DA SILVA", "JOAO PEREIRA")).toBe(0);
  });

  it("devolve um valor intermediário para sobreposição parcial", () => {
    const similaridade = nameSimilarity("JOSE CARLOS DOS SANTOS", "JOSE CARLOS SANTOS SILVA");
    expect(similaridade).toBeGreaterThan(0);
    expect(similaridade).toBeLessThan(1);
  });

  it("é insensível a caixa e a espaços extras", () => {
    expect(nameSimilarity("maria   da silva", "MARIA DA SILVA")).toBe(1);
  });

  it("devolve 0 quando um dos nomes é vazio", () => {
    expect(nameSimilarity("", "MARIA")).toBe(0);
    expect(nameSimilarity("MARIA", "")).toBe(0);
  });
});
