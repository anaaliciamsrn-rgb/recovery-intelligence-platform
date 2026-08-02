import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ClassificacaoController } from "../controllers/ClassificacaoController.js";

export interface ClassificacaoRoutesDependencies {
  classificacaoController: ClassificacaoController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/classificacoes` (ver modules/classification/container.ts). */
export function createClassificacaoRouter(deps: ClassificacaoRoutesDependencies): Router {
  const router = Router();

  router.get(
    "/:dossieId",
    deps.authenticate,
    asyncHandler(deps.classificacaoController.classificar),
  );

  return router;
}
