import type { HealthCheckResponse } from "@rip/shared-types";
import type { IAppMetadataProvider } from "../ports/IAppMetadataProvider.js";
import type { ICacheHealthIndicator } from "../ports/ICacheHealthIndicator.js";
import type { IDatabaseHealthIndicator } from "../ports/IDatabaseHealthIndicator.js";
import type { IProcessMetricsProvider } from "../ports/IProcessMetricsProvider.js";

export class GetSystemHealthUseCase {
  constructor(
    private readonly databaseHealthIndicator: IDatabaseHealthIndicator,
    private readonly cacheHealthIndicator: ICacheHealthIndicator,
    private readonly appMetadataProvider: IAppMetadataProvider,
    private readonly processMetricsProvider: IProcessMetricsProvider,
  ) {}

  async execute(): Promise<HealthCheckResponse> {
    const [database, cache] = await Promise.all([
      this.databaseHealthIndicator.check(),
      this.cacheHealthIndicator.check(),
    ]);

    const status = database.status === "ok" && cache.status === "ok" ? "ok" : "degraded";

    return {
      status,
      app: this.appMetadataProvider.getMetadata(),
      runtime: this.processMetricsProvider.collect(),
      dependencies: { database, cache },
    };
  }
}
