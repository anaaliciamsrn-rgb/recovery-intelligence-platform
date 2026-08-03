import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { PrismaVersionSnapshotRepository } from "../dossier-versioning/infrastructure/persistence/PrismaVersionSnapshotRepository.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { PrismaTenantResourceOwnershipRepository } from "../tenant/infrastructure/persistence/PrismaTenantResourceOwnershipRepository.js";
import { FindDossieForCandidateUseCase } from "./application/use-cases/FindDossieForCandidateUseCase.js";
import { ResolveIdentityUseCase } from "./application/use-cases/ResolveIdentityUseCase.js";
import { FuzzyDocumentAndNameMatchStrategy } from "./infrastructure/FuzzyDocumentAndNameMatchStrategy.js";
import { PartyByNameIdentitySourceProvider } from "./infrastructure/PartyByNameIdentitySourceProvider.js";
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
  // Duas fontes: documento exato/completo (PartyIdentitySourceProvider) e
  // busca por nome, que funciona mesmo com documento incompleto/errado
  // (PartyByNameIdentitySourceProvider) — juntas viabilizam a busca pública
  // "digite um CPF/CNPJ (mesmo que impreciso) ou nome e veja a confiança de
  // ser a mesma pessoa/empresa", ver ADR 0037. `FuzzyDocumentAndNameMatchStrategy`
  // substitui `ExactDocumentMatchStrategy` aqui porque um match binário
  // (idêntico ou nada) não produz "possível correspondência" nenhuma.
  const sourceProviders = [
    new PartyIdentitySourceProvider(pessoaRepository, empresaRepository),
    new PartyByNameIdentitySourceProvider(pessoaRepository, empresaRepository),
  ];
  const strategy = new FuzzyDocumentAndNameMatchStrategy();

  const resolveIdentityUseCase = new ResolveIdentityUseCase(sourceProviders, strategy);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const versionSnapshotRepository = new PrismaVersionSnapshotRepository(prisma);
  const tenantResourceOwnershipRepository = new PrismaTenantResourceOwnershipRepository(prisma);
  const findDossieForCandidateUseCase = new FindDossieForCandidateUseCase(
    dossieRepository,
    versionSnapshotRepository,
    tenantResourceOwnershipRepository,
  );

  const identityResolutionController = new IdentityResolutionController(
    resolveIdentityUseCase,
    findDossieForCandidateUseCase,
  );
  const identityResolutionRouter = createIdentityResolutionRouter({
    identityResolutionController,
    authenticate,
  });

  return { identityResolutionRouter };
}
