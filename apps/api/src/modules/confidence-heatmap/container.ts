import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { PrismaVersionSnapshotRepository } from "../dossier-versioning/infrastructure/persistence/PrismaVersionSnapshotRepository.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { GetConfidenceHeatmapUseCase } from "./application/use-cases/GetConfidenceHeatmapUseCase.js";
import { ConfidenceHeatmapController } from "./presentation/controllers/ConfidenceHeatmapController.js";
import { createConfidenceHeatmapRouter } from "./presentation/routes/confidence-heatmap.routes.js";

export interface ConfidenceHeatmapModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface ConfidenceHeatmapModule {
  confidenceHeatmapRouter: Router;
}

/** Composition root do módulo. Ver ADR 0024. */
export function buildConfidenceHeatmapModule(
  deps: ConfidenceHeatmapModuleDependencies,
): ConfidenceHeatmapModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.CONFIDENCE_HEATMAP_READ);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const versionSnapshotRepository = new PrismaVersionSnapshotRepository(prisma);

  const classificationRules: IClassificationRule[] = [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ];
  const classificarDossieUseCase = new ClassificarDossieUseCase(
    dossieRepository,
    classificationRules,
  );

  const getConfidenceHeatmapUseCase = new GetConfidenceHeatmapUseCase(
    dossieRepository,
    classificarDossieUseCase,
    versionSnapshotRepository,
  );
  const confidenceHeatmapController = new ConfidenceHeatmapController(getConfidenceHeatmapUseCase);
  const confidenceHeatmapRouter = createConfidenceHeatmapRouter({
    confidenceHeatmapController,
    authenticate,
    authorizeRead,
  });

  return { confidenceHeatmapRouter };
}
