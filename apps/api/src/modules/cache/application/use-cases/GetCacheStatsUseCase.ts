import type { ICacheStore } from "../ports/ICacheStore.js";

export interface CacheStats {
  namespace: string;
  hits: number;
  misses: number;
  hitRatio: number;
}

/** Estatísticas de hit/miss por namespace — atualizadas a cada `GetCacheEntryUseCase.execute()`. Ver ADR 0033. */
export class GetCacheStatsUseCase {
  constructor(private readonly cacheStore: ICacheStore) {}

  async execute(namespace: string): Promise<CacheStats> {
    const hits = await this.cacheStore.getCounter(`cache:stats:${namespace}:hits`);
    const misses = await this.cacheStore.getCounter(`cache:stats:${namespace}:misses`);
    const total = hits + misses;

    return {
      namespace,
      hits,
      misses,
      hitRatio: total > 0 ? Math.round((hits / total) * 10000) / 10000 : 0,
    };
  }
}
