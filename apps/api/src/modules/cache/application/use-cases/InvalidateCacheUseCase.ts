import { AppError } from "../../../../application/errors/AppError.js";
import { CacheKey, InvalidCacheKeyError } from "../../domain/value-objects/CacheKey.js";
import type { ICacheStore } from "../ports/ICacheStore.js";

export interface InvalidateCacheInput {
  namespace: string;
  /** Sem `identifier`: invalida todas as chaves do namespace de uma vez (ex.: todo o cache de um dossiê). Ver ADR 0033. */
  identifier?: string | null;
}

export interface InvalidateCacheResult {
  chavesRemovidas: number;
}

export class InvalidateCacheUseCase {
  constructor(private readonly cacheStore: ICacheStore) {}

  async execute(input: InvalidateCacheInput): Promise<InvalidateCacheResult> {
    try {
      if (input.identifier) {
        const chave = CacheKey.build(input.namespace, input.identifier);
        const removidas = await this.cacheStore.delete(chave);
        return { chavesRemovidas: removidas };
      }

      const chaveSemIdentifier = CacheKey.build(input.namespace);
      const removidaChaveBase = await this.cacheStore.delete(chaveSemIdentifier);
      const removidasPorPrefixo = await this.cacheStore.deleteByPrefix(
        CacheKey.namespacePrefix(input.namespace),
      );
      return { chavesRemovidas: removidaChaveBase + removidasPorPrefixo };
    } catch (error) {
      if (error instanceof InvalidCacheKeyError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }
  }
}
