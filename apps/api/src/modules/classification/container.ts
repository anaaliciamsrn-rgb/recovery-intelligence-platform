import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import type { IClassificationRule } from "./application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "./application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "./infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "./infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "./infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { ClassificacaoController } from "./presentation/controllers/ClassificacaoController.js";
import { createClassificacaoRouter } from "./presentation/routes/classificacao.routes.js";

export interface ClassificationModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface ClassificationModule {
  classificacaoRouter: Router;
}

/**
 * Composition root do módulo. As regras registradas aqui são a única lista
 * de verdade do motor — adicionar uma regra nova é implementar
 * `IClassificationRule` e acrescentá-la neste array, sem tocar no use case
 * nem no scorer. Ver ADR 0016.
 */
export function buildClassificationModule(
  deps: ClassificationModuleDependencies,
): ClassificationModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const rules: IClassificationRule[] = [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ];

  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, rules);
  const classificacaoController = new ClassificacaoController(classificarDossieUseCase);
  const classificacaoRouter = createClassificacaoRouter({ classificacaoController, authenticate });

  return { classificacaoRouter };
}
