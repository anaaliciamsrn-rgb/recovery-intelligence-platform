import { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { Redis } from "ioredis";
import { GetSystemHealthUseCase } from "../application/use-cases/get-system-health.use-case.js";
import type { ILogger } from "../application/ports/ILogger.js";
import { env } from "../shared/config/env.js";
import { RedisHealthIndicator } from "../infrastructure/cache/redis-health-indicator.js";
import { PrismaHealthIndicator } from "../infrastructure/database/prisma-health-indicator.js";
import { createLogger } from "../infrastructure/logging/logger.js";
import { AppMetadataProvider } from "../infrastructure/observability/app-metadata-provider.js";
import { PrometheusMetricsProvider } from "../infrastructure/observability/prometheus-metrics-provider.js";
import { ProcessMetricsProvider } from "../infrastructure/observability/process-metrics-provider.js";
import { buildAnalyticsModule } from "../modules/analytics/container.js";
import { buildAuditTrailModule } from "../modules/audit-trail/container.js";
import { buildCaseManagementModule } from "../modules/case-management/container.js";
import { buildTenantModule } from "../modules/tenant/container.js";
import { buildWorkflowModule } from "../modules/workflow/container.js";
import { buildClassificationModule } from "../modules/classification/container.js";
import { buildConfidenceHeatmapModule } from "../modules/confidence-heatmap/container.js";
import { buildDossieModule } from "../modules/dossie/container.js";
import { buildDossierVersioningModule } from "../modules/dossier-versioning/container.js";
import { buildExplainabilityModule } from "../modules/explainability/container.js";
import { buildImportModule } from "../modules/import/container.js";
import { buildPromptBuilderModule } from "../modules/prompt-builder/container.js";
import { buildRecommendationModule } from "../modules/recommendation/container.js";
import { buildFeatureFlagsModule } from "../modules/feature-flags/container.js";
import { buildRuleBuilderModule } from "../modules/rule-builder/container.js";
import { buildCacheModule } from "../modules/cache/container.js";
import { buildSchedulerModule } from "../modules/scheduler/container.js";
import { buildIdentityModule } from "../modules/identity/container.js";
import { buildIdentityResolutionModule } from "../modules/identity-resolution/container.js";
import { buildPartyModule } from "../modules/party/container.js";
import { buildSimulationModule } from "../modules/simulation/container.js";
import { HealthController } from "../presentation/http/controllers/health.controller.js";
import { createApp } from "../presentation/http/app.js";

/**
 * Composition root: único lugar que conhece tanto os ports (application/domain)
 * quanto as implementações concretas (infrastructure). Faz a injeção manual de
 * dependências — sem framework de DI (ver docs/architecture/decisions/0003).
 */
export interface Container {
  app: Express;
  prisma: PrismaClient;
  redis: Redis;
  logger: ILogger;
  processMetricsProvider: ProcessMetricsProvider;
}

export function buildContainer(): Container {
  const logger = createLogger(env);

  const prisma = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });
  redis.on("error", (error: Error) =>
    logger.error("redis_connection_error", { error: error.message }),
  );

  const databaseHealthIndicator = new PrismaHealthIndicator(prisma, logger);
  const cacheHealthIndicator = new RedisHealthIndicator(redis, logger);
  const appMetadataProvider = new AppMetadataProvider(env);
  const processMetricsProvider = new ProcessMetricsProvider();
  const metricsProvider = new PrometheusMetricsProvider();

  const getSystemHealthUseCase = new GetSystemHealthUseCase(
    databaseHealthIndicator,
    cacheHealthIndicator,
    appMetadataProvider,
    processMetricsProvider,
  );
  const healthController = new HealthController(getSystemHealthUseCase);

  const identityModule = buildIdentityModule({ prisma, redis, logger, env });
  const partyModule = buildPartyModule({ prisma, env });
  const identityResolutionModule = buildIdentityResolutionModule({ prisma, env });
  const dossieModule = buildDossieModule({ prisma, env });
  const classificationModule = buildClassificationModule({ prisma, env });
  const recommendationModule = buildRecommendationModule({ prisma, env });
  const promptBuilderModule = buildPromptBuilderModule({ prisma, env });
  const importModule = buildImportModule({ prisma, env });
  const explainabilityModule = buildExplainabilityModule({ prisma, env });
  const auditTrailModule = buildAuditTrailModule({ prisma, env, logger });
  const dossierVersioningModule = buildDossierVersioningModule({ prisma, env, logger });
  const simulationModule = buildSimulationModule({ prisma, env });
  const confidenceHeatmapModule = buildConfidenceHeatmapModule({ prisma, env });
  const analyticsModule = buildAnalyticsModule({ prisma, env });
  const caseManagementModule = buildCaseManagementModule({ prisma, env });
  const workflowModule = buildWorkflowModule({ prisma, env });
  const tenantModule = buildTenantModule({ prisma, env });
  const ruleBuilderModule = buildRuleBuilderModule({ prisma, env });
  const featureFlagsModule = buildFeatureFlagsModule({ prisma, env });
  const schedulerModule = buildSchedulerModule({ prisma, env });
  const cacheModule = buildCacheModule({ redis, env });

  const app = createApp({
    logger,
    redis,
    env,
    healthController,
    metricsProvider,
    identityRouter: identityModule.router,
    pessoaRouter: partyModule.pessoaRouter,
    empresaRouter: partyModule.empresaRouter,
    participacaoSocietariaRouter: partyModule.participacaoSocietariaRouter,
    identityResolutionRouter: identityResolutionModule.identityResolutionRouter,
    dossieRouter: dossieModule.dossieRouter,
    classificacaoRouter: classificationModule.classificacaoRouter,
    recomendacaoRouter: recommendationModule.recommendationRouter,
    promptRouter: promptBuilderModule.promptRouter,
    importRouter: importModule.importRouter,
    explainabilityRouter: explainabilityModule.explainabilityRouter,
    auditRouter: auditTrailModule.auditRouter,
    auditTrailMiddleware: auditTrailModule.auditTrailMiddleware,
    dossierVersioningRouter: dossierVersioningModule.dossierVersioningRouter,
    versionSnapshotMiddleware: dossierVersioningModule.versionSnapshotMiddleware,
    simulationRouter: simulationModule.simulationRouter,
    confidenceHeatmapRouter: confidenceHeatmapModule.confidenceHeatmapRouter,
    analyticsRouter: analyticsModule.analyticsRouter,
    caseRouter: caseManagementModule.caseRouter,
    workflowRouter: workflowModule.workflowRouter,
    workflowInstanceRouter: workflowModule.workflowInstanceRouter,
    tenantRouter: tenantModule.tenantRouter,
    resolveTenantMiddleware: tenantModule.resolveTenantMiddleware,
    ruleBuilderRouter: ruleBuilderModule.ruleBuilderRouter,
    featureFlagRouter: featureFlagsModule.featureFlagRouter,
    schedulerRouter: schedulerModule.schedulerRouter,
    cacheRouter: cacheModule.cacheRouter,
  });

  return { app, prisma, redis, logger, processMetricsProvider };
}
