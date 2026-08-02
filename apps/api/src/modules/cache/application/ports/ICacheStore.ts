/**
 * Abstração de armazenamento — a application layer nunca conhece Redis
 * diretamente (ver `RedisCacheStore`, infrastructure). Ver ADR 0033.
 */
export interface ICacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Devolve quantas chaves foram de fato removidas (0 ou 1). */
  delete(key: string): Promise<number>;
  /** Remove todas as chaves com o prefixo dado; devolve quantas foram removidas. */
  deleteByPrefix(prefix: string): Promise<number>;
  /** `null` quando a chave não existe; segundos restantes (pode ser 0) quando existe. */
  getTtlSeconds(key: string): Promise<number | null>;
  incrementCounter(key: string): Promise<number>;
  getCounter(key: string): Promise<number>;
}
