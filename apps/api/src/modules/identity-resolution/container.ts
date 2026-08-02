import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { ResolveIdentityUseCase } from "./application/use-cases/ResolveIdentityUseCase.js";
import { ExactDocumentMatchStrategy } from "./infrastructure/ExactDocumentMatchStrategy.js";
import { PartyIdentitySourceProvider } from "./infrastructure/PartyIdentitySourceProvider.js";
import { IdentityResolutionController } from "./presentation/controllers/IdentityResolutionController.js";
import { createIdentityResolutionRouter } from "./presentation/routes/identity-resolution.routes.js";

export interface IdentityResolutionModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface IdentityResolutionModule {
  identityResolutionRouter: Router;
}

/**
 * Composition root do módulo. Instancia seus próprios `JwtTokenProvider` e
 * repositórios Prisma de `party` (stateless, sem custo real de duplicar) em
 * vez de receber instâncias de outros módulos — mesmo padrão de
 * modules/party/container.ts. Ver ADR 0013.
 */
export function buildIdentityResolutionModule(
  deps: IdentityResolutionModuleDependencies,
): IdentityResolutionModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);
  const sourceProviders = [new PartyIdentitySourceProvider(pessoaRepository, empresaRepository)];
  const strategy = new ExactDocumentMatchStrategy();

  const resolveIdentityUseCase = new ResolveIdentityUseCase(sourceProviders, strategy);
  const identityResolutionController = new IdentityResolutionController(resolveIdentityUseCase);
  const identityResolutionRouter = createIdentityResolutionRouter({
    identityResolutionController,
    authenticate,
  });

  return { identityResolutionRouter };
}
