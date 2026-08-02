import cookieParser from "cookie-parser";
import express, { type Express, type RequestHandler, type Router } from "express";
import type { ILogger } from "../../application/ports/ILogger.js";
import type { IMetricsProvider } from "../../application/ports/IMetricsProvider.js";
import type { Env } from "../../shared/config/env.js";
import type { HealthController } from "./controllers/health.controller.js";
import { errorHandlerMiddleware } from "./middlewares/error-handler.middleware.js";
import { httpLoggerMiddleware } from "./middlewares/http-logger.middleware.js";
import { metricsMiddleware } from "./middlewares/metrics.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import {
  createRateLimitMiddleware,
  type RedisCommandClient,
} from "./middlewares/rate-limit.middleware.js";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import {
  corsMiddleware,
  securityHeadersMiddleware,
} from "./middlewares/security-headers.middleware.js";
import { createOpenApiRouter } from "./openapi/openapi.routes.js";
import { createApiRouter } from "./routes/index.js";
import { createMetricsRouter } from "./routes/metrics.routes.js";

export interface AppDependencies {
  logger: ILogger;
  redis: RedisCommandClient;
  env: Env;
  healthController: HealthController;
  metricsProvider: IMetricsProvider;
  /** Router já montado pelo composition root do módulo (ver modules/identity/container.ts). */
  identityRouter: Router;
  /** Routers já montados pelo composition root do módulo (ver modules/party/container.ts). */
  pessoaRouter: Router;
  empresaRouter: Router;
  participacaoSocietariaRouter: Router;
  identityResolutionRouter: Router;
  dossieRouter: Router;
  classificacaoRouter: Router;
  recomendacaoRouter: Router;
  promptRouter: Router;
  importRouter: Router;
  explainabilityRouter: Router;
  auditRouter: Router;
  /** Middleware do módulo audit-trail — observa as rotas de negócio, ver modules/audit-trail/container.ts. */
  auditTrailMiddleware: RequestHandler;
  dossierVersioningRouter: Router;
  /** Middleware do módulo dossier-versioning — observa as rotas de negócio, ver modules/dossier-versioning/container.ts. */
  versionSnapshotMiddleware: RequestHandler;
  simulationRouter: Router;
  confidenceHeatmapRouter: Router;
  analyticsRouter: Router;
  caseRouter: Router;
  workflowRouter: Router;
  workflowInstanceRouter: Router;
  tenantRouter: Router;
  /** Middleware do módulo tenant — resolve `req.tenantId` a partir do header `X-Tenant-Id`, ver modules/tenant/container.ts. */
  resolveTenantMiddleware: RequestHandler;
  ruleBuilderRouter: Router;
  featureFlagRouter: Router;
  schedulerRouter: Router;
  cacheRouter: Router;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware());
  app.use(corsMiddleware(deps.env.CORS_ALLOWED_ORIGINS));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(httpLoggerMiddleware(deps.logger));
  app.use(metricsMiddleware(deps.metricsProvider));
  app.use(deps.auditTrailMiddleware);
  app.use(deps.versionSnapshotMiddleware);
  app.use(deps.resolveTenantMiddleware);
  app.use(
    createRateLimitMiddleware(deps.redis, {
      windowMs: deps.env.RATE_LIMIT_WINDOW_MS,
      max: deps.env.RATE_LIMIT_MAX_REQUESTS,
      keyPrefix: "rl:global:",
    }),
  );

  app.use("/api/v1", createApiRouter({ healthController: deps.healthController }));
  app.use("/api/v1", createOpenApiRouter());
  app.use("/api/v1", createMetricsRouter(deps.metricsProvider));
  app.use("/api/v1/auth", deps.identityRouter);
  app.use("/api/v1/pessoas", deps.pessoaRouter);
  app.use("/api/v1/empresas", deps.empresaRouter);
  app.use("/api/v1/participacoes-societarias", deps.participacaoSocietariaRouter);
  app.use("/api/v1/identity-resolution", deps.identityResolutionRouter);
  app.use("/api/v1/dossies", deps.dossieRouter);
  app.use("/api/v1/classificacoes", deps.classificacaoRouter);
  app.use("/api/v1/recomendacoes", deps.recomendacaoRouter);
  app.use("/api/v1/prompts", deps.promptRouter);
  app.use("/api/v1/imports", deps.importRouter);
  app.use("/api/v1/classification", deps.explainabilityRouter);
  app.use("/api/v1/audit", deps.auditRouter);
  app.use("/api/v1/dossiers", deps.dossierVersioningRouter);
  app.use("/api/v1/simulation", deps.simulationRouter);
  app.use("/api/v1/confidence-heatmap", deps.confidenceHeatmapRouter);
  app.use("/api/v1/analytics", deps.analyticsRouter);
  app.use("/api/v1/cases", deps.caseRouter);
  app.use("/api/v1/workflows", deps.workflowRouter);
  app.use("/api/v1/workflow-instances", deps.workflowInstanceRouter);
  app.use("/api/v1/tenants", deps.tenantRouter);
  app.use("/api/v1/rules", deps.ruleBuilderRouter);
  app.use("/api/v1/feature-flags", deps.featureFlagRouter);
  app.use("/api/v1/scheduler", deps.schedulerRouter);
  app.use("/api/v1/cache", deps.cacheRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(deps.logger, deps.env));

  return app;
}
