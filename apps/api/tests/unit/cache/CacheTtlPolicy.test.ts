import { CacheTtlPolicy } from "../../../src/modules/cache/domain/services/CacheTtlPolicy.js";

describe("CacheTtlPolicy", () => {
  it("usa o TTL específico de analytics", () => {
    expect(CacheTtlPolicy.resolverTtlSegundos("analytics")).toBe(120);
  });

  it("usa o TTL específico de confidence-heatmap", () => {
    expect(CacheTtlPolicy.resolverTtlSegundos("confidence-heatmap")).toBe(30);
  });

  it("usa o TTL padrão para um namespace sem política específica", () => {
    expect(CacheTtlPolicy.resolverTtlSegundos("namespace-desconhecido")).toBe(60);
  });

  it("um override explícito sempre vence o padrão do namespace", () => {
    expect(CacheTtlPolicy.resolverTtlSegundos("analytics", 5)).toBe(5);
  });

  it("ignora um override inválido (zero ou negativo) e usa o padrão do namespace", () => {
    expect(CacheTtlPolicy.resolverTtlSegundos("analytics", 0)).toBe(120);
    expect(CacheTtlPolicy.resolverTtlSegundos("analytics", -10)).toBe(120);
  });
});
