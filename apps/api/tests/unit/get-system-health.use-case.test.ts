import type { AppMetadata, DependencyHealth, ProcessMetrics } from "@rip/shared-types";
import { GetSystemHealthUseCase } from "../../src/application/use-cases/get-system-health.use-case.js";
import type { IAppMetadataProvider } from "../../src/application/ports/IAppMetadataProvider.js";
import type { ICacheHealthIndicator } from "../../src/application/ports/ICacheHealthIndicator.js";
import type { IDatabaseHealthIndicator } from "../../src/application/ports/IDatabaseHealthIndicator.js";
import type { IProcessMetricsProvider } from "../../src/application/ports/IProcessMetricsProvider.js";

function makeIndicator(result: DependencyHealth): IDatabaseHealthIndicator & ICacheHealthIndicator {
  return { check: async () => result };
}

const fakeAppMetadataProvider: IAppMetadataProvider = {
  getMetadata: (): AppMetadata => ({
    version: "0.0.0-test",
    buildTimestamp: "unknown",
    nodeVersion: process.version,
    environment: "test",
  }),
};

const fakeProcessMetricsProvider: IProcessMetricsProvider = {
  collect: (): ProcessMetrics => ({
    uptimeSeconds: 42,
    memory: { rssMb: 1, heapUsedMb: 1, heapTotalMb: 1, externalMb: 0 },
    eventLoopDelay: { meanMs: 0, p99Ms: 0 },
    cpuUsagePercent: 0,
  }),
};

describe("GetSystemHealthUseCase", () => {
  it("retorna status ok quando banco e cache estão saudáveis", async () => {
    const useCase = new GetSystemHealthUseCase(
      makeIndicator({ status: "ok", latencyMs: 1 }),
      makeIndicator({ status: "ok", latencyMs: 1 }),
      fakeAppMetadataProvider,
      fakeProcessMetricsProvider,
    );

    const result = await useCase.execute();

    expect(result.status).toBe("ok");
    expect(result.dependencies).toEqual({
      database: { status: "ok", latencyMs: 1 },
      cache: { status: "ok", latencyMs: 1 },
    });
    expect(result.app).toEqual(fakeAppMetadataProvider.getMetadata());
    expect(result.runtime).toEqual(fakeProcessMetricsProvider.collect());
  });

  it("retorna status degraded quando uma dependência falha", async () => {
    const useCase = new GetSystemHealthUseCase(
      makeIndicator({ status: "ok", latencyMs: 1 }),
      makeIndicator({ status: "error", latencyMs: 5000 }),
      fakeAppMetadataProvider,
      fakeProcessMetricsProvider,
    );

    const result = await useCase.execute();

    expect(result.status).toBe("degraded");
    expect(result.dependencies.cache).toEqual({ status: "error", latencyMs: 5000 });
  });
});
