import { Router } from "express";
import type { HealthController } from "../controllers/health.controller.js";
import { createHealthRouter } from "./health.routes.js";

export interface ApiRouterDependencies {
  healthController: HealthController;
}

export function createApiRouter(deps: ApiRouterDependencies): Router {
  const router = Router();
  router.use(createHealthRouter(deps.healthController));
  return router;
}
