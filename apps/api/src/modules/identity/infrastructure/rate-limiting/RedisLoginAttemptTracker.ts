import type { Redis } from "ioredis";
import type {
  ILoginAttemptTracker,
  LoginAttemptState,
} from "../../application/ports/ILoginAttemptTracker.js";

const KEY_PREFIX = "identity:login-attempts:";

/**
 * Reaproveita o mesmo limiar/janela do bloqueio de conta persistido
 * (`ACCOUNT_LOCKOUT_THRESHOLD`/`_DURATION_SECONDS`) — simplificação
 * deliberada para não duplicar um segundo par de env vars quase idêntico.
 * O ganho aqui não é um limiar diferente, é responder "bloqueado" sem
 * bater no Postgres.
 */
export class RedisLoginAttemptTracker implements ILoginAttemptTracker {
  constructor(
    private readonly redis: Redis,
    private readonly blockThreshold: number,
    private readonly windowSeconds: number,
  ) {}

  async recordFailure(identifier: string): Promise<LoginAttemptState> {
    const key = this.buildKey(identifier);
    const failureCount = await this.redis.incr(key);

    if (failureCount === 1) {
      await this.redis.expire(key, this.windowSeconds);
    }

    return { failureCount, isBlocked: failureCount >= this.blockThreshold };
  }

  async recordSuccess(identifier: string): Promise<void> {
    await this.redis.del(this.buildKey(identifier));
  }

  async getState(identifier: string): Promise<LoginAttemptState> {
    const raw = await this.redis.get(this.buildKey(identifier));
    const failureCount = raw ? Number(raw) : 0;
    return { failureCount, isBlocked: failureCount >= this.blockThreshold };
  }

  private buildKey(identifier: string): string {
    return `${KEY_PREFIX}${identifier}`;
  }
}
