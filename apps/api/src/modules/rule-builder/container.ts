import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { CreateRuleDefinitionUseCase } from "./application/use-cases/CreateRuleDefinitionUseCase.js";
import { EvaluateRulesUseCase } from "./application/use-cases/EvaluateRulesUseCase.js";
import { GetRuleDefinitionUseCase } from "./application/use-cases/GetRuleDefinitionUseCase.js";
import { ListRuleDefinitionsUseCase } from "./application/use-cases/ListRuleDefinitionsUseCase.js";
import { UpdateRuleDefinitionUseCase } from "./application/use-cases/UpdateRuleDefinitionUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaRuleDefinitionRepository } from "./infrastructure/persistence/PrismaRuleDefinitionRepository.js";
import { PrismaRuleVersionRepository } from "./infrastructure/persistence/PrismaRuleVersionRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { RuleBuilderController } from "./presentation/controllers/RuleBuilderController.js";
import { createRuleBuilderRouter } from "./presentation/routes/rule-builder.routes.js";

export interface RuleBuilderModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface RuleBuilderModule {
  ruleBuilderRouter: Router;
}

/** Composition root do módulo. Ver ADR 0030. */
export function buildRuleBuilderModule(deps: RuleBuilderModuleDependencies): RuleBuilderModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.RULE_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.RULE_WRITE);

  const ruleDefinitionRepository = new PrismaRuleDefinitionRepository(prisma);
  const ruleVersionRepository = new PrismaRuleVersionRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createRuleDefinitionUseCase = new CreateRuleDefinitionUseCase(
    ruleDefinitionRepository,
    ruleVersionRepository,
    idGenerator,
    clock,
  );
  const updateRuleDefinitionUseCase = new UpdateRuleDefinitionUseCase(
    ruleDefinitionRepository,
    ruleVersionRepository,
    idGenerator,
    clock,
  );
  const getRuleDefinitionUseCase = new GetRuleDefinitionUseCase(
    ruleDefinitionRepository,
    ruleVersionRepository,
  );
  const listRuleDefinitionsUseCase = new ListRuleDefinitionsUseCase(ruleDefinitionRepository);
  const evaluateRulesUseCase = new EvaluateRulesUseCase(ruleDefinitionRepository);

  const ruleBuilderController = new RuleBuilderController(
    createRuleDefinitionUseCase,
    updateRuleDefinitionUseCase,
    getRuleDefinitionUseCase,
    listRuleDefinitionsUseCase,
    evaluateRulesUseCase,
  );
  const ruleBuilderRouter = createRuleBuilderRouter({
    ruleBuilderController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { ruleBuilderRouter };
}
