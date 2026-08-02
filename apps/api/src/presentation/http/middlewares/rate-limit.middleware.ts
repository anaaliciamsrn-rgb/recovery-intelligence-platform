import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { RedisStore, type RedisReply } from "rate-limit-redis";

/**
 * Único método do cliente Redis que este middleware realmente usa. Estreitar
 * o tipo (em vez de exigir a classe `Redis` inteira) segue ISP e permite
 * testar com um fake em memória, sem depender de um Redis real (ver
 * tests/support/fake-redis-command-client.ts).
 */
export interface RedisCommandClient {
  call(...args: (string | Buffer | number)[]): Promise<unknown>;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /**
   * Prefixo da chave no Redis. Obrigatório: duas instâncias deste middleware
   * sem prefixos distintos compartilham a mesma chave (IP) no mesmo Redis e
   * passam a incrementar o mesmo contador uma da outra — ver ADR 0010
   * (rate limit de login precisa ser isolado do rate limit global).
   */
  keyPrefix: string;
}

/**
 * Genérico de propósito — não lê `Env` diretamente, para poder ser
 * reaproveitado com limites diferentes (ex.: o rate limit específico da
 * rota de login, mais estrito que o global — ver ADR 0010).
 */
export function createRateLimitMiddleware(
  redis: RedisCommandClient,
  options: RateLimitOptions,
): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: options.keyPrefix,
      sendCommand: (...args: string[]) =>
        redis.call(...(args as [string, ...string[]])) as unknown as Promise<RedisReply>,
    }),
  });
}
