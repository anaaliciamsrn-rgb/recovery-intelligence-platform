import { GetCacheEntryUseCase } from "../../../src/modules/cache/application/use-cases/GetCacheEntryUseCase.js";
import { GetCacheStatsUseCase } from "../../../src/modules/cache/application/use-cases/GetCacheStatsUseCase.js";
import { InvalidateCacheUseCase } from "../../../src/modules/cache/application/use-cases/InvalidateCacheUseCase.js";
import { SetCacheEntryUseCase } from "../../../src/modules/cache/application/use-cases/SetCacheEntryUseCase.js";
import { FakeCacheStore } from "./fakes.js";

describe("SetCacheEntryUseCase + GetCacheEntryUseCase", () => {
  it("grava e lê de volta o mesmo valor, com TTL do namespace resolvido", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);

    const gravado = await setUseCase.execute({
      namespace: "analytics",
      valor: { totalPessoas: 42 },
    });
    expect(gravado).toEqual({ chave: "cache:analytics", ttlSegundos: 120 });

    const lido = await getUseCase.execute({ namespace: "analytics" });
    expect(lido.hit).toBe(true);
    expect(lido.valor).toEqual({ totalPessoas: 42 });
    expect(lido.ttlRestanteSegundos).toBeGreaterThan(0);
  });

  it("respeita um override de TTL explícito", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);

    const gravado = await setUseCase.execute({
      namespace: "dossie",
      identifier: "d1",
      valor: "x",
      ttlSegundos: 5,
    });
    expect(gravado.ttlSegundos).toBe(5);
  });

  it("miss quando a chave nunca foi gravada", async () => {
    const cacheStore = new FakeCacheStore();
    const getUseCase = new GetCacheEntryUseCase(cacheStore);

    const resultado = await getUseCase.execute({ namespace: "dossie", identifier: "inexistente" });

    expect(resultado).toEqual({ hit: false, valor: null, ttlRestanteSegundos: null });
  });

  it("isola por identifier — dois dossiês diferentes nunca compartilham entrada", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);

    await setUseCase.execute({ namespace: "dossie", identifier: "d1", valor: "valor-d1" });
    await setUseCase.execute({ namespace: "dossie", identifier: "d2", valor: "valor-d2" });

    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d1" })).valor).toBe(
      "valor-d1",
    );
    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d2" })).valor).toBe(
      "valor-d2",
    );
  });
});

describe("InvalidateCacheUseCase", () => {
  it("invalida só a chave de um identifier específico, sem afetar outras do mesmo namespace", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);
    const invalidateUseCase = new InvalidateCacheUseCase(cacheStore);

    await setUseCase.execute({ namespace: "dossie", identifier: "d1", valor: "v1" });
    await setUseCase.execute({ namespace: "dossie", identifier: "d2", valor: "v2" });

    const resultado = await invalidateUseCase.execute({ namespace: "dossie", identifier: "d1" });

    expect(resultado).toEqual({ chavesRemovidas: 1 });
    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d1" })).hit).toBe(false);
    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d2" })).hit).toBe(true);
  });

  it("sem identifier, invalida todo o namespace de uma vez (ex.: todo cache de um dossiê)", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);
    const invalidateUseCase = new InvalidateCacheUseCase(cacheStore);

    await setUseCase.execute({ namespace: "dossie", identifier: "d1", valor: "v1" });
    await setUseCase.execute({ namespace: "dossie", identifier: "d2", valor: "v2" });
    await setUseCase.execute({ namespace: "dossie", valor: "sem-identifier" });

    const resultado = await invalidateUseCase.execute({ namespace: "dossie" });

    expect(resultado.chavesRemovidas).toBe(3);
    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d1" })).hit).toBe(false);
    expect((await getUseCase.execute({ namespace: "dossie", identifier: "d2" })).hit).toBe(false);
    expect((await getUseCase.execute({ namespace: "dossie" })).hit).toBe(false);
  });

  it("invalidar um namespace nunca afeta outro namespace", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);
    const invalidateUseCase = new InvalidateCacheUseCase(cacheStore);

    await setUseCase.execute({ namespace: "dossie", identifier: "d1", valor: "v1" });
    await setUseCase.execute({ namespace: "analytics", valor: "v-analytics" });

    await invalidateUseCase.execute({ namespace: "dossie" });

    expect((await getUseCase.execute({ namespace: "analytics" })).hit).toBe(true);
  });
});

describe("GetCacheStatsUseCase", () => {
  it("contabiliza hits e misses por namespace e calcula o hitRatio", async () => {
    const cacheStore = new FakeCacheStore();
    const setUseCase = new SetCacheEntryUseCase(cacheStore);
    const getUseCase = new GetCacheEntryUseCase(cacheStore);
    const statsUseCase = new GetCacheStatsUseCase(cacheStore);

    await setUseCase.execute({ namespace: "analytics", valor: "x" });
    await getUseCase.execute({ namespace: "analytics" });
    await getUseCase.execute({ namespace: "analytics" });
    await getUseCase.execute({ namespace: "analytics", identifier: "inexistente" });

    const stats = await statsUseCase.execute("analytics");

    expect(stats).toEqual({ namespace: "analytics", hits: 2, misses: 1, hitRatio: 0.6667 });
  });

  it("hitRatio é 0 quando nunca houve nenhuma leitura", async () => {
    const statsUseCase = new GetCacheStatsUseCase(new FakeCacheStore());
    expect(await statsUseCase.execute("namespace-nunca-lido")).toEqual({
      namespace: "namespace-nunca-lido",
      hits: 0,
      misses: 0,
      hitRatio: 0,
    });
  });
});
