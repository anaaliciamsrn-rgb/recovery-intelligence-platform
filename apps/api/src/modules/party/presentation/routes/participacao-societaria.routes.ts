import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ParticipacaoSocietariaController } from "../controllers/ParticipacaoSocietariaController.js";

export interface ParticipacaoSocietariaRoutesDependencies {
  participacaoSocietariaController: ParticipacaoSocietariaController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/participacoes-societarias` (ver modules/party/container.ts). */
export function createParticipacaoSocietariaRouter(
  deps: ParticipacaoSocietariaRoutesDependencies,
): Router {
  const router = Router();
  const controller = deps.participacaoSocietariaController;

  router.post("/", deps.authenticate, asyncHandler(controller.register));
  router.get("/", deps.authenticate, asyncHandler(controller.list));
  router.post("/:id/encerrar", deps.authenticate, asyncHandler(controller.encerrar));

  return router;
}
