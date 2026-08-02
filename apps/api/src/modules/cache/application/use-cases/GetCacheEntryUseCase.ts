import { AppError } from "../../../../application/errors/AppError.js";
import { CacheKey, InvalidCacheKeyError } from "../../domain/value-objects/CacheKey.js";
import type { ICacheStore } from "../ports/ICacheStore.js";

export interface GetCacheEntryInput {
  namespace: string;
  identifier?: string | null;
}

export interface GetCacheEntryResult {
  hit: boolean;
  valor: unknown;
  ttlRestanteSegundos: number | null;
}

function statsCounterKey(namespace: string, resultado: "hits" | "misses"): string {
  return `cache:stats:${namespace}:${resultado}`;
}

/** Lê o cache e atualiza os contadores de hit/miss do namespace (ver `GetCacheStatsUseCase`). Ver ADR 0033. */
export class GetCacheEntryUseCase {
  constructor(private readonly cacheStore: ICacheStore) {}

  async execute(input: GetCacheEntryInput): Promise<GetCacheEntryResult> {
    let chave: string;
    try {
      chave = CacheKey.build(input.namespace, input.identifier);
    } catch (error) {
      if (error instanceof InvalidCacheKeyError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    const valorSerializado = await this.cacheStore.get(chave);

    if (valorSerializado === null) {
      await this.cacheStore.incrementCounter(statsCounterKey(input.namespace, "misses"));
      return { hit: false, valor: null, ttlRestanteSegundos: null };
    }

    await this.cacheStore.incrementCounter(statsCounterKey(input.namespace, "hits"));
    const ttlRestanteSegundos = await this.cacheStore.getTtlSeconds(chave);
    return { hit: true, valor: JSON.parse(valorSerializado), ttlRestanteSegundos };
  }
}
