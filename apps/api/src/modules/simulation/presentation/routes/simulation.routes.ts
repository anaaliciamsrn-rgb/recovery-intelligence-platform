import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { SimulationController } from "../controllers/SimulationController.js";

export interface SimulationRoutesDependencies {
  simulationController: SimulationController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/simulation` (ver modules/simulation/container.ts). */
export function createSimulationRouter(deps: SimulationRoutesDependencies): Router {
  const router = Router();

  router.post("/", deps.authenticate, asyncHandler(deps.simulationController.run));

  return router;
}
