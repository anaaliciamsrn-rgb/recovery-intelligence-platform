import { createHash } from "node:crypto";
import type { RedisCommandClient } from "../../src/presentation/http/middlewares/rate-limit.middleware.js";

/**
 * Fake em memória do subconjunto de comandos Redis que `rate-limit-redis`
 * emite (SCRIPT LOAD / EVALSHA / DECR / DEL), reimplementando a mesma
 * semântica do script Lua de incremento (janela fixa com PTTL + SET PX,
 * depois INCR) sem depender de um Redis real. Isso é o que torna o teste de
 * rate limiting independente de Docker e determinístico.
 *
 * Cada instância tem seu próprio estado — crie uma nova por teste para
 * garantir isolamento entre casos.
 */
export class FakeRedisCommandClient implements RedisCommandClient {
  private readonly counters = new Map<string, { hits: number; expiresAt: number }>();

  async call(...args: (string | Buffer | number)[]): Promise<unknown> {
    const [command, ...rest] = args.map((arg) => String(arg));

    switch (command) {
      case "SCRIPT":
        // SCRIPT LOAD <script> -> devolve um "sha" qualquer, só precisa ser estável.
        return createHash("sha1")
          .update(rest[1] ?? "")
          .digest("hex");
      case "EVALSHA":
        return this.evalIncrement(rest);
      case "DECR":
        return this.decrement(rest[0] ?? "");
      case "DEL":
        this.counters.delete(rest[0] ?? "");
        return 1;
      default:
        throw new Error(`FakeRedisCommandClient: comando não suportado: ${command}`);
    }
  }

  private evalIncrement(args: string[]): [number, number] {
    // args: [sha, numKeys, key, resetOnChangeFlag, windowMs]
    const key = args[2] ?? "";
    const resetOnChange = args[3] === "1";
    const windowMs = Number(args[4] ?? 60_000);
    const now = Date.now();
    const entry = this.counters.get(key);

    if (!entry || entry.expiresAt <= now) {
      this.counters.set(key, { hits: 1, expiresAt: now + windowMs });
      return [1, windowMs];
    }

    entry.hits += 1;
    if (resetOnChange) {
      entry.expiresAt = now + windowMs;
    }
    return [entry.hits, entry.expiresAt - now];
  }

  private decrement(key: string): number {
    const entry = this.counters.get(key);
    if (!entry) return 0;
    entry.hits = Math.max(0, entry.hits - 1);
    return entry.hits;
  }
}
