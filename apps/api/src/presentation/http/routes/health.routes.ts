import { Router } from "express";
import { asyncHandler } from "../../../shared/async-handler.js";
import type { HealthController } from "../controllers/health.controller.js";

export function createHealthRouter(healthController: HealthController): Router {
  const router = Router();
  router.get("/health", asyncHandler(healthController.handle));
  return router;
}
