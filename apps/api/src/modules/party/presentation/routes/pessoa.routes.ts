import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { PessoaController } from "../controllers/PessoaController.js";

export interface PessoaRoutesDependencies {
  pessoaController: PessoaController;
  /** Construído no container do módulo a partir do `authenticate.middleware.ts` de identity — ver ADR 0011. */
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/pessoas` pelo app.ts raiz (ver modules/party/container.ts). */
export function createPessoaRouter(deps: PessoaRoutesDependencies): Router {
  const router = Router();

  router.post("/", deps.authenticate, asyncHandler(deps.pessoaController.register));
  router.get("/id/:id", deps.authenticate, asyncHandler(deps.pessoaController.getById));
  router.get("/:cpf", deps.authenticate, asyncHandler(deps.pessoaController.getByCpf));

  return router;
}
