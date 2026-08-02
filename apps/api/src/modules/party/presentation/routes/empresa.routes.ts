import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { EmpresaController } from "../controllers/EmpresaController.js";

export interface EmpresaRoutesDependencies {
  empresaController: EmpresaController;
  /** Construído no container do módulo a partir do `authenticate.middleware.ts` de identity — ver ADR 0011. */
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/empresas` pelo app.ts raiz (ver modules/party/container.ts). */
export function createEmpresaRouter(deps: EmpresaRoutesDependencies): Router {
  const router = Router();

  router.post("/", deps.authenticate, asyncHandler(deps.empresaController.register));
  router.get("/id/:id", deps.authenticate, asyncHandler(deps.empresaController.getById));
  router.get("/:cnpj", deps.authenticate, asyncHandler(deps.empresaController.getByCnpj));

  return router;
}
