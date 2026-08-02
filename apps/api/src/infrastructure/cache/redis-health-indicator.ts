import type { DependencyHealth } from "@rip/shared-types";
import type { Redis } from "ioredis";
import type { ICacheHealthIndicator } from "../../application/ports/ICacheHealthIndicator.js";
import type { ILogger } from "../../application/ports/ILogger.js";
import { elapsedMs, now } from "../../shared/timing.js";

export class RedisHealthIndicator implements ICacheHealthIndicator {
  constructor(
    private readonly redis: Redis,
    private readonly logger: ILogger,
  ) {}

  async check(): Promise<DependencyHealth> {
    const startedAt = now();

    try {
      const reply = await this.redis.ping();
      const status = reply === "PONG" ? "ok" : "error";
      return { status, latencyMs: elapsedMs(startedAt) };
    } catch (error) {
      this.logger.error("cache_health_check_failed", {
        error: error instanceof Error ? error.message : error,
      });
      return { status: "error", latencyMs: elapsedMs(startedAt) };
    }
  }
}
