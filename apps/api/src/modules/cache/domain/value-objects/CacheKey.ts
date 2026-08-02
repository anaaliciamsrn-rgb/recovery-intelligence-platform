import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidCacheKeyError extends DomainError {}

const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const ROOT_PREFIX = "cache";

/**
 * Constrói a chave real usada no Redis a partir de um `namespace` (ex.:
 * `"analytics"`, `"confidence-heatmap"`, `"dossie"`) e um `identifier`
 * opcional (ex.: um `dossieId`) — "cache por endpoint/dossiê/analytics" do
 * requisito é este par. Prefixo `cache:` isola do namespace de chaves já
 * usado pelo rate limit (`rl:...`, ver `rate-limit.middleware.ts`). Ver
 * ADR 0033.
 */
export class CacheKey {
  static build(namespace: string, identifier?: string | null): string {
    CacheKey.validarSegmento(namespace, "namespace");
    if (identifier) {
      CacheKey.validarSegmento(identifier, "identifier");
      return `${ROOT_PREFIX}:${namespace}:${identifier}`;
    }
    return `${ROOT_PREFIX}:${namespace}`;
  }

  /** Prefixo usado para invalidar todas as chaves de um namespace de uma vez (`SCAN` + `DEL`, ver `RedisCacheStore`). */
  static namespacePrefix(namespace: string): string {
    CacheKey.validarSegmento(namespace, "namespace");
    return `${ROOT_PREFIX}:${namespace}:`;
  }

  private static validarSegmento(valor: string, campo: string): void {
    if (!SEGMENT_PATTERN.test(valor)) {
      throw new InvalidCacheKeyError(
        `${campo} inválido: "${valor}" — use apenas letras, números, ponto, hífen e underscore`,
      );
    }
  }
}
