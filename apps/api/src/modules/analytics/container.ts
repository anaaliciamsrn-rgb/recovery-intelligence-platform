import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { PrismaVersionSnapshotRepository } from "../dossier-versioning/infrastructure/persistence/PrismaVersionSnapshotRepository.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { PrismaImportBatchRepository } from "../import/infrastructure/persistence/PrismaImportBatchRepository.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { GetAnalyticsSummaryUseCase } from "./application/use-cases/GetAnalyticsSummaryUseCase.js";
import { AnalyticsController } from "./presentation/controllers/AnalyticsController.js";
import { createAnalyticsRouter } from "./presentation/routes/analytics.routes.js";

export interface AnalyticsModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface AnalyticsModule {
  analyticsRouter: Router;
}

/** Composition root do módulo. Ver ADR 0025. */
export function buildAnalyticsModule(deps: AnalyticsModuleDependencies): AnalyticsModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.ANALYTICS_READ);

  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);
  const importBatchRepository = new PrismaImportBatchRepository(prisma);
  const versionSnapshotRepository = new PrismaVersionSnapshotRepository(prisma);

  const getAnalyticsSummaryUseCase = new GetAnalyticsSummaryUseCase(
    pessoaRepository,
    empresaRepository,
    importBatchRepository,
    versionSnapshotRepository,
  );
  const analyticsController = new AnalyticsController(getAnalyticsSummaryUseCase);
  const analyticsRouter = createAnalyticsRouter({
    analyticsController,
    authenticate,
    authorizeRead,
  });

  return { analyticsRouter };
}
