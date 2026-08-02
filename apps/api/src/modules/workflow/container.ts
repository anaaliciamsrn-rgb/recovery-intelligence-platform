import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { CreateWorkflowDefinitionUseCase } from "./application/use-cases/CreateWorkflowDefinitionUseCase.js";
import { GetWorkflowDefinitionUseCase } from "./application/use-cases/GetWorkflowDefinitionUseCase.js";
import { GetWorkflowInstanceUseCase } from "./application/use-cases/GetWorkflowInstanceUseCase.js";
import { ListWorkflowDefinitionsUseCase } from "./application/use-cases/ListWorkflowDefinitionsUseCase.js";
import { StartWorkflowInstanceUseCase } from "./application/use-cases/StartWorkflowInstanceUseCase.js";
import { TriggerWorkflowTransitionUseCase } from "./application/use-cases/TriggerWorkflowTransitionUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaWorkflowDefinitionRepository } from "./infrastructure/persistence/PrismaWorkflowDefinitionRepository.js";
import { PrismaWorkflowInstanceHistoryRepository } from "./infrastructure/persistence/PrismaWorkflowInstanceHistoryRepository.js";
import { PrismaWorkflowInstanceRepository } from "./infrastructure/persistence/PrismaWorkflowInstanceRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { WorkflowController } from "./presentation/controllers/WorkflowController.js";
import {
  createWorkflowInstanceRouter,
  createWorkflowRouter,
} from "./presentation/routes/workflow.routes.js";

export interface WorkflowModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface WorkflowModule {
  workflowRouter: Router;
  workflowInstanceRouter: Router;
}

/** Composition root do módulo. Ver ADR 0027. */
export function buildWorkflowModule(deps: WorkflowModuleDependencies): WorkflowModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.WORKFLOW_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.WORKFLOW_WRITE);

  const workflowDefinitionRepository = new PrismaWorkflowDefinitionRepository(prisma);
  const workflowInstanceRepository = new PrismaWorkflowInstanceRepository(prisma);
  const workflowInstanceHistoryRepository = new PrismaWorkflowInstanceHistoryRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createWorkflowDefinitionUseCase = new CreateWorkflowDefinitionUseCase(
    workflowDefinitionRepository,
    idGenerator,
    clock,
  );
  const listWorkflowDefinitionsUseCase = new ListWorkflowDefinitionsUseCase(
    workflowDefinitionRepository,
  );
  const getWorkflowDefinitionUseCase = new GetWorkflowDefinitionUseCase(
    workflowDefinitionRepository,
  );
  const startWorkflowInstanceUseCase = new StartWorkflowInstanceUseCase(
    workflowDefinitionRepository,
    workflowInstanceRepository,
    idGenerator,
    clock,
  );
  const triggerWorkflowTransitionUseCase = new TriggerWorkflowTransitionUseCase(
    workflowDefinitionRepository,
    workflowInstanceRepository,
    workflowInstanceHistoryRepository,
    idGenerator,
    clock,
  );
  const getWorkflowInstanceUseCase = new GetWorkflowInstanceUseCase(
    workflowInstanceRepository,
    workflowInstanceHistoryRepository,
  );

  const workflowController = new WorkflowController(
    createWorkflowDefinitionUseCase,
    listWorkflowDefinitionsUseCase,
    getWorkflowDefinitionUseCase,
    startWorkflowInstanceUseCase,
    triggerWorkflowTransitionUseCase,
    getWorkflowInstanceUseCase,
  );

  const workflowRouter = createWorkflowRouter({
    workflowController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });
  const workflowInstanceRouter = createWorkflowInstanceRouter({
    workflowController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { workflowRouter, workflowInstanceRouter };
}
