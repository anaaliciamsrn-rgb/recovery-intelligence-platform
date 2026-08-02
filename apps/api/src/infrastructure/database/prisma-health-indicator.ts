import type { DependencyHealth } from "@rip/shared-types";
import type { PrismaClient } from "@prisma/client";
import type { IDatabaseHealthIndicator } from "../../application/ports/IDatabaseHealthIndicator.js";
import type { ILogger } from "../../application/ports/ILogger.js";
import { elapsedMs, now } from "../../shared/timing.js";

export class PrismaHealthIndicator implements IDatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
  ) {}

  async check(): Promise<DependencyHealth> {
    const startedAt = now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", latencyMs: elapsedMs(startedAt) };
    } catch (error) {
      this.logger.error("database_health_check_failed", {
        error: error instanceof Error ? error.message : error,
      });
      return { status: "error", latencyMs: elapsedMs(startedAt) };
    }
  }
}
