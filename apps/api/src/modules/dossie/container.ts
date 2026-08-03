import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { RegisterTenantResourceUseCase } from "../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { PrismaTenantRepository } from "../tenant/infrastructure/persistence/PrismaTenantRepository.js";
import { PrismaTenantResourceOwnershipRepository } from "../tenant/infrastructure/persistence/PrismaTenantResourceOwnershipRepository.js";
import { CreateDossieUseCase } from "./application/use-cases/CreateDossieUseCase.js";
import { GetDossieUseCase } from "./application/use-cases/GetDossieUseCase.js";
import { RegistrarEvidenciaUseCase } from "./application/use-cases/RegistrarEvidenciaUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaDossieRepository } from "./infrastructure/persistence/PrismaDossieRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { DossieController } from "./presentation/controllers/DossieController.js";
import { createDossieRouter } from "./presentation/routes/dossie.routes.js";

export interface DossieModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface DossieModule {
  dossieRouter: Router;
}

/**
 * Composition root do módulo. Depende de `party` (upstream) só para
 * validar que o sujeito do dossiê existe — nunca carrega o objeto Pessoa/
 * Empresa além disso. Ver ADR 0015.
 */
export function buildDossieModule(deps: DossieModuleDependencies): DossieModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const dossieRepository = new PrismaDossieRepository(prisma);
  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);

  const createDossieUseCase = new CreateDossieUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    idGenerator,
    clock,
  );
  const getDossieUseCase = new GetDossieUseCase(dossieRepository);
  const registrarEvidenciaUseCase = new RegistrarEvidenciaUseCase(dossieRepository, clock);

  // Duplicação deliberada das peças de `tenant` (mesmo padrão do resto da
  // plataforma, ver ADR 0037) — todo Dossiê criado por qualquer caminho
  // precisa de um `TenantResourceOwnership` para `analytics` conseguir
  // agregá-lo corretamente por tenant.
  const tenantRepository = new PrismaTenantRepository(prisma);
  const tenantResourceOwnershipRepository = new PrismaTenantResourceOwnershipRepository(prisma);
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    idGenerator,
    clock,
  );

  const dossieController = new DossieController(
    createDossieUseCase,
    getDossieUseCase,
    registrarEvidenciaUseCase,
    registerTenantResourceUseCase,
  );
  const dossieRouter = createDossieRouter({ dossieController, authenticate });

  return { dossieRouter };
}
