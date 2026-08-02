export type DependencyStatus = "ok" | "error";

/** Resultado de um health-check de dependência externa, com latência do round-trip. */
export interface DependencyHealth {
  status: DependencyStatus;
  latencyMs: number;
}

/** Metadados do artefato/ambiente em execução — nada disso é regra de negócio. */
export interface AppMetadata {
  version: string;
  buildTimestamp: string;
  nodeVersion: string;
  environment: string;
}

export interface MemoryUsage {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
}

export interface EventLoopDelay {
  meanMs: number;
  p99Ms: number;
}

/** Introspecção local do processo Node — sem I/O, sem dependência externa. */
export interface ProcessMetrics {
  uptimeSeconds: number;
  memory: MemoryUsage;
  eventLoopDelay: EventLoopDelay;
  cpuUsagePercent: number;
}

export interface HealthCheckResponse {
  status: "ok" | "degraded";
  app: AppMetadata;
  runtime: ProcessMetrics;
  dependencies: {
    database: DependencyHealth;
    cache: DependencyHealth;
  };
}
