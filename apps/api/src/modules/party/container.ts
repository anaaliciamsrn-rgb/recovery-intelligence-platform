import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { EncerrarParticipacaoSocietariaUseCase } from "./application/use-cases/EncerrarParticipacaoSocietariaUseCase.js";
import { GetEmpresaByCnpjUseCase } from "./application/use-cases/GetEmpresaByCnpjUseCase.js";
import { GetEmpresaByIdUseCase } from "./application/use-cases/GetEmpresaByIdUseCase.js";
import { GetPessoaByCpfUseCase } from "./application/use-cases/GetPessoaByCpfUseCase.js";
import { GetPessoaByIdUseCase } from "./application/use-cases/GetPessoaByIdUseCase.js";
import { ListParticipacoesByEmpresaUseCase } from "./application/use-cases/ListParticipacoesByEmpresaUseCase.js";
import { ListParticipacoesByPessoaUseCase } from "./application/use-cases/ListParticipacoesByPessoaUseCase.js";
import { RegisterEmpresaUseCase } from "./application/use-cases/RegisterEmpresaUseCase.js";
import { RegisterParticipacaoSocietariaUseCase } from "./application/use-cases/RegisterParticipacaoSocietariaUseCase.js";
import { RegisterPessoaUseCase } from "./application/use-cases/RegisterPessoaUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaEmpresaRepository } from "./infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaParticipacaoSocietariaRepository } from "./infrastructure/persistence/PrismaParticipacaoSocietariaRepository.js";
import { PrismaPessoaRepository } from "./infrastructure/persistence/PrismaPessoaRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { EmpresaController } from "./presentation/controllers/EmpresaController.js";
import { ParticipacaoSocietariaController } from "./presentation/controllers/ParticipacaoSocietariaController.js";
import { PessoaController } from "./presentation/controllers/PessoaController.js";
import { createEmpresaRouter } from "./presentation/routes/empresa.routes.js";
import { createParticipacaoSocietariaRouter } from "./presentation/routes/participacao-societaria.routes.js";
import { createPessoaRouter } from "./presentation/routes/pessoa.routes.js";

export interface PartyModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface PartyModule {
  pessoaRouter: Router;
  empresaRouter: Router;
  participacaoSocietariaRouter: Router;
}

/**
 * Composition root do módulo: único lugar (junto com o container raiz) que
 * conhece tanto os ports do módulo quanto suas implementações concretas.
 * Instancia seu próprio `JwtTokenProvider` (stateless, mesmo segredo do env)
 * em vez de receber a instância de identity — evita expor peças internas de
 * um módulo para outro (ver ADR 0011). `Pessoa` e `Empresa` não compartilham
 * nenhuma peça entre si além deste container e do middleware de autenticação.
 */
export function buildPartyModule(deps: PartyModuleDependencies): PartyModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();

  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const registerPessoaUseCase = new RegisterPessoaUseCase(pessoaRepository, idGenerator, clock);
  const getPessoaByCpfUseCase = new GetPessoaByCpfUseCase(pessoaRepository);
  const getPessoaByIdUseCase = new GetPessoaByIdUseCase(pessoaRepository);
  const pessoaController = new PessoaController(
    registerPessoaUseCase,
    getPessoaByCpfUseCase,
    getPessoaByIdUseCase,
  );
  const pessoaRouter = createPessoaRouter({ pessoaController, authenticate });

  const empresaRepository = new PrismaEmpresaRepository(prisma);
  const registerEmpresaUseCase = new RegisterEmpresaUseCase(empresaRepository, idGenerator, clock);
  const getEmpresaByCnpjUseCase = new GetEmpresaByCnpjUseCase(empresaRepository);
  const getEmpresaByIdUseCase = new GetEmpresaByIdUseCase(empresaRepository);
  const empresaController = new EmpresaController(
    registerEmpresaUseCase,
    getEmpresaByCnpjUseCase,
    getEmpresaByIdUseCase,
  );
  const empresaRouter = createEmpresaRouter({ empresaController, authenticate });

  const participacaoRepository = new PrismaParticipacaoSocietariaRepository(prisma);
  const registerParticipacaoUseCase = new RegisterParticipacaoSocietariaUseCase(
    participacaoRepository,
    pessoaRepository,
    empresaRepository,
    idGenerator,
    clock,
  );
  const encerrarParticipacaoUseCase = new EncerrarParticipacaoSocietariaUseCase(
    participacaoRepository,
    clock,
  );
  const listParticipacoesByEmpresaUseCase = new ListParticipacoesByEmpresaUseCase(
    participacaoRepository,
  );
  const listParticipacoesByPessoaUseCase = new ListParticipacoesByPessoaUseCase(
    participacaoRepository,
  );
  const participacaoSocietariaController = new ParticipacaoSocietariaController(
    registerParticipacaoUseCase,
    encerrarParticipacaoUseCase,
    listParticipacoesByEmpresaUseCase,
    listParticipacoesByPessoaUseCase,
  );
  const participacaoSocietariaRouter = createParticipacaoSocietariaRouter({
    participacaoSocietariaController,
    authenticate,
  });

  return { pessoaRouter, empresaRouter, participacaoSocietariaRouter };
}
