import {
  CacheKey,
  InvalidCacheKeyError,
} from "../../../src/modules/cache/domain/value-objects/CacheKey.js";

describe("CacheKey", () => {
  it("constrói a chave com namespace + identifier", () => {
    expect(CacheKey.build("dossie", "dossie-123")).toBe("cache:dossie:dossie-123");
  });

  it("constrói a chave só com namespace quando não há identifier", () => {
    expect(CacheKey.build("analytics")).toBe("cache:analytics");
  });

  it("rejeita namespace com caracteres inválidos", () => {
    expect(() => CacheKey.build("dossiê inválido")).toThrow(InvalidCacheKeyError);
  });

  it("rejeita identifier com caracteres inválidos", () => {
    expect(() => CacheKey.build("dossie", "id com espaço")).toThrow(InvalidCacheKeyError);
  });

  it("namespacePrefix() devolve o prefixo usado para invalidar o namespace inteiro", () => {
    expect(CacheKey.namespacePrefix("confidence-heatmap")).toBe("cache:confidence-heatmap:");
  });
});
