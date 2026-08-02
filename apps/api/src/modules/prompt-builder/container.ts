import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import type { IRecommendationRule } from "../recommendation/application/ports/IRecommendationRule.js";
import { GerarRecomendacoesUseCase } from "../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { BuildPromptUseCase } from "./application/use-cases/BuildPromptUseCase.js";
import { PromptController } from "./presentation/controllers/PromptController.js";
import { createPromptRouter } from "./presentation/routes/prompt.routes.js";

export interface PromptBuilderModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface PromptBuilderModule {
  promptRouter: Router;
}

/**
 * Composition root do módulo. Reconstrói suas próprias instâncias de
 * `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase` (mesmas regras dos
 * módulos originais, replicadas) em vez de receber as instâncias de outros
 * módulos — mesmo padrão de duplicação deliberada de todo o projeto (ADRs
 * 0010/0011/0013/0016/0017). Ver ADR 0018.
 */
export function buildPromptBuilderModule(
  deps: PromptBuilderModuleDependencies,
): PromptBuilderModule {
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
  const classificarDossieUseCase = new ClassificarDossieUseCase(
    dossieRepository,
    classificationRules,
  );

  const recommendationRules: IRecommendationRule[] = [
    new RecomendarWhatsappRule(),
    new RecomendarCobrancaAmigavelRule(),
    new RecomendarLigacaoRule(),
    new RecomendarParcelamentoRule(),
    new RecomendarCobrancaJuridicaRule(),
  ];
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(
    classificarDossieUseCase,
    recommendationRules,
  );

  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );

  const promptController = new PromptController(buildPromptUseCase);
  const promptRouter = createPromptRouter({ promptController, authenticate });

  return { promptRouter };
}
