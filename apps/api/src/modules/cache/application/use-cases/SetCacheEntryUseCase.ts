import { AppError } from "../../../../application/errors/AppError.js";
import { CacheKey, InvalidCacheKeyError } from "../../domain/value-objects/CacheKey.js";
import { CacheTtlPolicy } from "../../domain/services/CacheTtlPolicy.js";
import type { ICacheStore } from "../ports/ICacheStore.js";

export interface SetCacheEntryInput {
  namespace: string;
  identifier?: string | null;
  valor: unknown;
  ttlSegundos?: number | null;
}

export interface SetCacheEntryResult {
  chave: string;
  ttlSegundos: number;
}

/** Grava um valor no cache com o TTL resolvido pela política do namespace (ou um override explícito). Ver ADR 0033. */
export class SetCacheEntryUseCase {
  constructor(private readonly cacheStore: ICacheStore) {}

  async execute(input: SetCacheEntryInput): Promise<SetCacheEntryResult> {
    let chave: string;
    try {
      chave = CacheKey.build(input.namespace, input.identifier);
    } catch (error) {
      if (error instanceof InvalidCacheKeyError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    const ttlSegundos = CacheTtlPolicy.resolverTtlSegundos(input.namespace, input.ttlSegundos);
    await this.cacheStore.set(chave, JSON.stringify(input.valor), ttlSegundos);

    return { chave, ttlSegundos };
  }
}
