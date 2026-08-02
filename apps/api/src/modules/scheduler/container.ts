import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { CreateScheduledJobUseCase } from "./application/use-cases/CreateScheduledJobUseCase.js";
import { GetScheduledJobUseCase } from "./application/use-cases/GetScheduledJobUseCase.js";
import { ListScheduledJobsUseCase } from "./application/use-cases/ListScheduledJobsUseCase.js";
import { RunDueJobsUseCase } from "./application/use-cases/RunDueJobsUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { InMemoryJobHandlerRegistry } from "./infrastructure/InMemoryJobHandlerRegistry.js";
import { PrismaJobExecutionRepository } from "./infrastructure/persistence/PrismaJobExecutionRepository.js";
import { PrismaScheduledJobRepository } from "./infrastructure/persistence/PrismaScheduledJobRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { SchedulerController } from "./presentation/controllers/SchedulerController.js";
import { createSchedulerRouter } from "./presentation/routes/scheduler.routes.js";

export interface SchedulerModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface SchedulerModule {
  schedulerRouter: Router;
}

/** Composition root do módulo. Ver ADR 0032. */
export function buildSchedulerModule(deps: SchedulerModuleDependencies): SchedulerModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.SCHEDULER_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.SCHEDULER_WRITE);

  const scheduledJobRepository = new PrismaScheduledJobRepository(prisma);
  const jobExecutionRepository = new PrismaJobExecutionRepository(prisma);
  const jobHandlerRegistry = new InMemoryJobHandlerRegistry();
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createScheduledJobUseCase = new CreateScheduledJobUseCase(
    scheduledJobRepository,
    idGenerator,
    clock,
  );
  const getScheduledJobUseCase = new GetScheduledJobUseCase(
    scheduledJobRepository,
    jobExecutionRepository,
  );
  const listScheduledJobsUseCase = new ListScheduledJobsUseCase(scheduledJobRepository);
  const runDueJobsUseCase = new RunDueJobsUseCase(
    scheduledJobRepository,
    jobExecutionRepository,
    jobHandlerRegistry,
    idGenerator,
    clock,
  );

  const schedulerController = new SchedulerController(
    createScheduledJobUseCase,
    getScheduledJobUseCase,
    listScheduledJobsUseCase,
    runDueJobsUseCase,
  );
  const schedulerRouter = createSchedulerRouter({
    schedulerController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { schedulerRouter };
}
