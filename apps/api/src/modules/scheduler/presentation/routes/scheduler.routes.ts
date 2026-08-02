import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { SchedulerController } from "../controllers/SchedulerController.js";

export interface SchedulerRoutesDependencies {
  schedulerController: SchedulerController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/scheduler` (ver modules/scheduler/container.ts). RBAC: ver ADR 0029/0032. */
export function createSchedulerRouter(deps: SchedulerRoutesDependencies): Router {
  const router = Router();
  const controller = deps.schedulerController;

  router.post("/jobs", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.create));
  router.get("/jobs", deps.authenticate, deps.authorizeRead, asyncHandler(controller.list));
  router.get("/jobs/:id", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getById));
  router.post(
    "/jobs/run-due",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.runDue),
  );

  return router;
}
