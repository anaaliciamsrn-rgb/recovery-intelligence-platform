import { Router, type Express } from "express";
import type { AppMetadata, ProcessMetrics } from "@rip/shared-types";
import { GetSystemHealthUseCase } from "../../src/application/use-cases/get-system-health.use-case.js";
import type { IAppMetadataProvider } from "../../src/application/ports/IAppMetadataProvider.js";
import type { ILogger } from "../../src/application/ports/ILogger.js";
import type { IProcessMetricsProvider } from "../../src/application/ports/IProcessMetricsProvider.js";
import { PrometheusMetricsProvider } from "../../src/infrastructure/observability/prometheus-metrics-provider.js";
import { createApp } from "../../src/presentation/http/app.js";
import { HealthController } from "../../src/presentation/http/controllers/health.controller.js";
import type { RedisCommandClient } from "../../src/presentation/http/middlewares/rate-limit.middleware.js";
import type { Env } from "../../src/shared/config/env.js";
import { FakeRedisCommandClient } from "./fake-redis-command-client.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

function buildTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: "test",
    PORT: 3000,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    REDIS_URL: "redis://localhost:6379",
    CORS_ALLOWED_ORIGINS: "http://localhost:5173",
    LOG_LEVEL: "silent",
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    BUILD_TIMESTAMP: "unknown",
    JWT_ACCESS_SECRET: "test-only-secret-do-not-use-in-production-00000",
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
    ARGON2_MEMORY_COST_KB: 19_456,
    ARGON2_TIME_COST: 2,
    ARGON2_PARALLELISM: 1,
    LOGIN_RATE_LIMIT_WINDOW_MS: 60_000,
    LOGIN_RATE_LIMIT_MAX_REQUESTS: 1000,
    ACCOUNT_LOCKOUT_THRESHOLD: 10,
    ACCOUNT_LOCKOUT_DURATION_SECONDS: 900,
    REFRESH_TOKEN_COOKIE_NAME: "rip_refresh_token",
    COOKIE_SECURE: true,
    APP_URL: "http://localhost:5173",
    PASSWORD_RESET_TOKEN_TTL_SECONDS: 3_600,
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_FROM: "Recovery Intelligence Platform <no-reply@recovery-intelligence.local>",
    MICROSOFT_OAUTH_TENANT_ID: "common",
    ...overrides,
  };
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
    uptimeSeconds: 0,
    memory: { rssMb: 0, heapUsedMb: 0, heapTotalMb: 0, externalMb: 0 },
    eventLoopDelay: { meanMs: 0, p99Ms: 0 },
    cpuUsagePercent: 0,
  }),
};

/**
 * Health controller com indicators sempre-saudáveis: a lógica do
 * health-check em si já tem teste unitário próprio
 * (tests/unit/get-system-health.use-case.test.ts). Aqui só precisamos de uma
 * rota real para exercitar os middlewares, sem depender de Postgres/Redis
 * reais nem do sampler de CPU real (que abriria um timer por teste).
 */
function buildAlwaysHealthyController(): HealthController {
  const alwaysOk = { check: async () => ({ status: "ok" as const, latencyMs: 1 }) };
  return new HealthController(
    new GetSystemHealthUseCase(
      alwaysOk,
      alwaysOk,
      fakeAppMetadataProvider,
      fakeProcessMetricsProvider,
    ),
  );
}

export interface TestAppOptions {
  env?: Partial<Env>;
  redis?: RedisCommandClient;
}

export interface TestApp {
  app: Express;
  env: Env;
}

/**
 * Monta a app real (mesma `createApp` usada em produção) com fakes só para
 * as dependências de infraestrutura externa (Redis, logger, health
 * indicators) — os middlewares de segurança/CORS/request-id/rate-limit sob
 * teste são exatamente os de produção, sem substituição.
 */
export function buildTestApp(options: TestAppOptions = {}): TestApp {
  const env = buildTestEnv(options.env);
  const redis = options.redis ?? new FakeRedisCommandClient();

  const app = createApp({
    logger: noopLogger,
    redis,
    env,
    healthController: buildAlwaysHealthyController(),
    metricsProvider: new PrometheusMetricsProvider(),
    // Vazio de propósito: estes testes cobrem middlewares globais
    // (Helmet/CORS/request-id/rate-limit), não os módulos identity/party.
    identityRouter: Router(),
    pessoaRouter: Router(),
    empresaRouter: Router(),
    participacaoSocietariaRouter: Router(),
    identityResolutionRouter: Router(),
    dossieRouter: Router(),
    classificacaoRouter: Router(),
    recomendacaoRouter: Router(),
    promptRouter: Router(),
    importRouter: Router(),
    explainabilityRouter: Router(),
    auditRouter: Router(),
    auditTrailMiddleware: (_req, _res, next) => next(),
    dossierVersioningRouter: Router(),
    versionSnapshotMiddleware: (_req, _res, next) => next(),
    simulationRouter: Router(),
    confidenceHeatmapRouter: Router(),
    analyticsRouter: Router(),
    caseRouter: Router(),
    workflowRouter: Router(),
    workflowInstanceRouter: Router(),
    tenantRouter: Router(),
    resolveTenantMiddleware: (_req, _res, next) => next(),
    ruleBuilderRouter: Router(),
    featureFlagRouter: Router(),
    schedulerRouter: Router(),
    cacheRouter: Router(),
  });

  return { app, env };
}
