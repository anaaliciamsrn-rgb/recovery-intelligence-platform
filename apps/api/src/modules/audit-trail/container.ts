import type { PrismaClient } from "@prisma/client";
import type { RequestHandler, Router } from "express";
import type { ILogger } from "../../application/ports/ILogger.js";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { GetAuditEventByIdUseCase } from "./application/use-cases/GetAuditEventByIdUseCase.js";
import { ListAuditEventsByEntityUseCase } from "./application/use-cases/ListAuditEventsByEntityUseCase.js";
import { ListAuditEventsByRequestIdUseCase } from "./application/use-cases/ListAuditEventsByRequestIdUseCase.js";
import { ListAuditEventsByUserUseCase } from "./application/use-cases/ListAuditEventsByUserUseCase.js";
import { ListAuditEventsUseCase } from "./application/use-cases/ListAuditEventsUseCase.js";
import { RecordAuditEventUseCase } from "./application/use-cases/RecordAuditEventUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaAuditEventRepository } from "./infrastructure/persistence/PrismaAuditEventRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { AuditController } from "./presentation/controllers/AuditController.js";
import { createAuditTrailMiddleware } from "./presentation/middlewares/auditTrail.middleware.js";
import { createAuditRouter } from "./presentation/routes/audit.routes.js";

export interface AuditTrailModuleDependencies {
  prisma: PrismaClient;
  env: Env;
  logger: ILogger;
}

export interface AuditTrailModule {
  auditRouter: Router;
  /** Middleware global — deve ser montado com `app.use(...)` antes das rotas de negócio, para observá-las. */
  auditTrailMiddleware: RequestHandler;
}

/**
 * Composition root do módulo. `auditTrailMiddleware` é o único ponto de
 * contato deste módulo com os demais — só observa requisição/resposta já
 * prontas, nunca chama nenhum use case de outro módulo. Ver ADR 0021.
 */
export function buildAuditTrailModule(deps: AuditTrailModuleDependencies): AuditTrailModule {
  const { prisma, env, logger } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const auditEventRepository = new PrismaAuditEventRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const recordAuditEventUseCase = new RecordAuditEventUseCase(
    auditEventRepository,
    idGenerator,
    clock,
  );
  const listAuditEventsUseCase = new ListAuditEventsUseCase(auditEventRepository);
  const getAuditEventByIdUseCase = new GetAuditEventByIdUseCase(auditEventRepository);
  const listAuditEventsByEntityUseCase = new ListAuditEventsByEntityUseCase(auditEventRepository);
  const listAuditEventsByUserUseCase = new ListAuditEventsByUserUseCase(auditEventRepository);
  const listAuditEventsByRequestIdUseCase = new ListAuditEventsByRequestIdUseCase(
    auditEventRepository,
  );

  const auditController = new AuditController(
    listAuditEventsUseCase,
    getAuditEventByIdUseCase,
    listAuditEventsByEntityUseCase,
    listAuditEventsByUserUseCase,
    listAuditEventsByRequestIdUseCase,
  );
  const auditRouter = createAuditRouter({ auditController, authenticate });
  const auditTrailMiddleware = createAuditTrailMiddleware(recordAuditEventUseCase, logger);

  return { auditRouter, auditTrailMiddleware };
}
