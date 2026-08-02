import type { Redis } from "ioredis";
import type { ICacheStore } from "../application/ports/ICacheStore.js";

const SCAN_COUNT_HINT = 200;

/**
 * `SCAN` (nunca `KEYS`) para invalidação por prefixo — `KEYS` bloqueia o
 * Redis inteiro em produção com muitas chaves; `SCAN` itera em lotes sem
 * bloquear. Ver ADR 0033.
 */
export class RedisCacheStore implements ICacheStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async delete(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let removidas = 0;
    let cursor = "0";

    do {
      const [proximoCursor, chaves] = await this.redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        SCAN_COUNT_HINT,
      );
      cursor = proximoCursor;
      if (chaves.length > 0) {
        removidas += await this.redis.del(...chaves);
      }
    } while (cursor !== "0");

    return removidas;
  }

  async getTtlSeconds(key: string): Promise<number | null> {
    const ttl = await this.redis.ttl(key);
    return ttl < 0 ? null : ttl;
  }

  async incrementCounter(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async getCounter(key: string): Promise<number> {
    const valor = await this.redis.get(key);
    return valor ? Number(valor) : 0;
  }
}
