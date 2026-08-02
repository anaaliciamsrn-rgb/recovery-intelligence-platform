import type { PrismaClient } from "@prisma/client";
import type { RequestHandler, Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { CheckTenantAccessUseCase } from "./application/use-cases/CheckTenantAccessUseCase.js";
import { CreateTenantUseCase } from "./application/use-cases/CreateTenantUseCase.js";
import { GetTenantUseCase } from "./application/use-cases/GetTenantUseCase.js";
import { ListTenantsUseCase } from "./application/use-cases/ListTenantsUseCase.js";
import { RegisterTenantResourceUseCase } from "./application/use-cases/RegisterTenantResourceUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaTenantRepository } from "./infrastructure/persistence/PrismaTenantRepository.js";
import { PrismaTenantResourceOwnershipRepository } from "./infrastructure/persistence/PrismaTenantResourceOwnershipRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { TenantController } from "./presentation/controllers/TenantController.js";
import { createResolveTenantMiddleware } from "./presentation/middlewares/resolveTenant.middleware.js";
import { createTenantRouter } from "./presentation/routes/tenant.routes.js";

export interface TenantModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface TenantModule {
  tenantRouter: Router;
  /** Middleware global — deve ser montado com `app.use(...)` antes das rotas, para resolver `req.tenantId`. Nunca bloqueia (ver ADR 0028). */
  resolveTenantMiddleware: RequestHandler;
}

/** Composition root do módulo. Ver ADR 0028. */
export function buildTenantModule(deps: TenantModuleDependencies): TenantModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeManage = createAuthorizeMiddleware(Permission.TENANT_MANAGE);

  const tenantRepository = new PrismaTenantRepository(prisma);
  const tenantResourceOwnershipRepository = new PrismaTenantResourceOwnershipRepository(prisma);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const createTenantUseCase = new CreateTenantUseCase(tenantRepository, idGenerator, clock);
  const listTenantsUseCase = new ListTenantsUseCase(tenantRepository);
  const getTenantUseCase = new GetTenantUseCase(tenantRepository);
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    idGenerator,
    clock,
  );
  const checkTenantAccessUseCase = new CheckTenantAccessUseCase(tenantResourceOwnershipRepository);

  const tenantController = new TenantController(
    createTenantUseCase,
    listTenantsUseCase,
    getTenantUseCase,
    registerTenantResourceUseCase,
    checkTenantAccessUseCase,
  );
  const tenantRouter = createTenantRouter({ tenantController, authenticate, authorizeManage });
  const resolveTenantMiddleware = createResolveTenantMiddleware(tenantRepository);

  return { tenantRouter, resolveTenantMiddleware };
}
