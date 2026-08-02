import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { CreateFeatureFlagUseCase } from "./application/use-cases/CreateFeatureFlagUseCase.js";
import { EvaluateFeatureFlagUseCase } from "./application/use-cases/EvaluateFeatureFlagUseCase.js";
import { GetFeatureFlagUseCase } from "./application/use-cases/GetFeatureFlagUseCase.js";
import { ListFeatureFlagsUseCase } from "./application/use-cases/ListFeatureFlagsUseCase.js";
import { RemoveFeatureFlagOverrideUseCase } from "./application/use-cases/RemoveFeatureFlagOverrideUseCase.js";
import { SetFeatureFlagOverrideUseCase } from "./application/use-cases/SetFeatureFlagOverrideUseCase.js";
import { UpdateFeatureFlagUseCase } from "./application/use-cases/UpdateFeatureFlagUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaFeatureFlagOverrideRepository } from "./infrastructure/persistence/PrismaFeatureFlagOverrideRepository.js";
import { PrismaFeatureFlagRepository } from "./infrastructure/persistence/PrismaFeatureFlagRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { FeatureFlagController } from "./presentation/controllers/FeatureFlagController.js";
import { createFeatureFlagRouter } from "./presentation/routes/feature-flags.routes.js";

export interface FeatureFlagsModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface FeatureFlagsModule {
  featureFlagRouter: Router;
}

/** Composition root do módulo. Ver ADR 0031. */
export function buildFeatureFlagsModule(deps: FeatureFlagsModuleDependencies): FeatureFlagsModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.FEATURE_FLAG_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.FEATURE_FLAG_WRITE);

  const featureFlagRepository = new PrismaFeatureFlagRepository(prisma);
  const featureFlagOverrideRepository = new PrismaFeatureFlagOverrideRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createFeatureFlagUseCase = new CreateFeatureFlagUseCase(
    featureFlagRepository,
    idGenerator,
    clock,
  );
  const updateFeatureFlagUseCase = new UpdateFeatureFlagUseCase(featureFlagRepository, clock);
  const getFeatureFlagUseCase = new GetFeatureFlagUseCase(
    featureFlagRepository,
    featureFlagOverrideRepository,
  );
  const listFeatureFlagsUseCase = new ListFeatureFlagsUseCase(featureFlagRepository);
  const setFeatureFlagOverrideUseCase = new SetFeatureFlagOverrideUseCase(
    featureFlagRepository,
    featureFlagOverrideRepository,
    idGenerator,
    clock,
  );
  const removeFeatureFlagOverrideUseCase = new RemoveFeatureFlagOverrideUseCase(
    featureFlagRepository,
    featureFlagOverrideRepository,
  );
  const evaluateFeatureFlagUseCase = new EvaluateFeatureFlagUseCase(
    featureFlagRepository,
    featureFlagOverrideRepository,
  );

  const featureFlagController = new FeatureFlagController(
    createFeatureFlagUseCase,
    updateFeatureFlagUseCase,
    getFeatureFlagUseCase,
    listFeatureFlagsUseCase,
    setFeatureFlagOverrideUseCase,
    removeFeatureFlagOverrideUseCase,
    evaluateFeatureFlagUseCase,
  );
  const featureFlagRouter = createFeatureFlagRouter({
    featureFlagController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { featureFlagRouter };
}
