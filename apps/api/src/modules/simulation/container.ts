import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import type { IRecommendationRule } from "../recommendation/application/ports/IRecommendationRule.js";
import { RecomendarCobrancaAmigavelRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { RunSimulationUseCase } from "./application/use-cases/RunSimulationUseCase.js";
import { InMemoryDossieRepositoryFactory } from "./infrastructure/InMemoryDossieRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { SimulationController } from "./presentation/controllers/SimulationController.js";
import { createSimulationRouter } from "./presentation/routes/simulation.routes.js";

export interface SimulationModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface SimulationModule {
  simulationRouter: Router;
}

/**
 * Composition root do módulo. Reconstrói suas próprias instâncias das
 * regras de classificação/recomendação (mesmas regras dos módulos
 * originais, replicadas) — mesmo padrão de duplicação deliberada de todo
 * o projeto (ADRs 0010–0022). Nenhum use case de `dossie` é chamado além
 * de `IDossieRepository.findById` (leitura) — o motor nunca persiste
 * nada, por isso não há nenhuma dependência de escrita aqui. Ver ADR 0023.
 */
export function buildSimulationModule(deps: SimulationModuleDependencies): SimulationModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);

  const classificationRules: IClassificationRule[] = [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ];

  const recommendationRules: IRecommendationRule[] = [
    new RecomendarWhatsappRule(),
    new RecomendarCobrancaAmigavelRule(),
    new RecomendarLigacaoRule(),
    new RecomendarParcelamentoRule(),
    new RecomendarCobrancaJuridicaRule(),
  ];

  const clock = new SystemClock();
  const inMemoryDossieRepositoryFactory = new InMemoryDossieRepositoryFactory();

  const runSimulationUseCase = new RunSimulationUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificationRules,
    recommendationRules,
    clock,
    inMemoryDossieRepositoryFactory,
  );

  const simulationController = new SimulationController(runSimulationUseCase);
  const simulationRouter = createSimulationRouter({ simulationController, authenticate });

  return { simulationRouter };
}
