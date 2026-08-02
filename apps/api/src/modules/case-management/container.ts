import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { AddCaseNoteUseCase } from "./application/use-cases/AddCaseNoteUseCase.js";
import { CreateCaseUseCase } from "./application/use-cases/CreateCaseUseCase.js";
import { GetCaseUseCase } from "./application/use-cases/GetCaseUseCase.js";
import { ListCasesUseCase } from "./application/use-cases/ListCasesUseCase.js";
import { UpdateCaseDetailsUseCase } from "./application/use-cases/UpdateCaseDetailsUseCase.js";
import { UpdateCaseStatusUseCase } from "./application/use-cases/UpdateCaseStatusUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaCaseHistoryRepository } from "./infrastructure/persistence/PrismaCaseHistoryRepository.js";
import { PrismaCaseNoteRepository } from "./infrastructure/persistence/PrismaCaseNoteRepository.js";
import { PrismaCaseRepository } from "./infrastructure/persistence/PrismaCaseRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { CaseController } from "./presentation/controllers/CaseController.js";
import { createCaseRouter } from "./presentation/routes/case.routes.js";

export interface CaseManagementModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface CaseManagementModule {
  caseRouter: Router;
}

/** Composition root do módulo. Ver ADR 0026. */
export function buildCaseManagementModule(
  deps: CaseManagementModuleDependencies,
): CaseManagementModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.CASE_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.CASE_WRITE);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const caseRepository = new PrismaCaseRepository(prisma);
  const caseNoteRepository = new PrismaCaseNoteRepository(prisma);
  const caseHistoryRepository = new PrismaCaseHistoryRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createCaseUseCase = new CreateCaseUseCase(
    caseRepository,
    caseHistoryRepository,
    dossieRepository,
    idGenerator,
    clock,
  );
  const updateCaseStatusUseCase = new UpdateCaseStatusUseCase(
    caseRepository,
    caseHistoryRepository,
    idGenerator,
    clock,
  );
  const updateCaseDetailsUseCase = new UpdateCaseDetailsUseCase(
    caseRepository,
    caseHistoryRepository,
    idGenerator,
    clock,
  );
  const addCaseNoteUseCase = new AddCaseNoteUseCase(
    caseRepository,
    caseNoteRepository,
    caseHistoryRepository,
    idGenerator,
    clock,
  );
  const getCaseUseCase = new GetCaseUseCase(
    caseRepository,
    caseNoteRepository,
    caseHistoryRepository,
  );
  const listCasesUseCase = new ListCasesUseCase(caseRepository);

  const caseController = new CaseController(
    createCaseUseCase,
    updateCaseStatusUseCase,
    updateCaseDetailsUseCase,
    addCaseNoteUseCase,
    getCaseUseCase,
    listCasesUseCase,
  );
  const caseRouter = createCaseRouter({
    caseController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { caseRouter };
}
