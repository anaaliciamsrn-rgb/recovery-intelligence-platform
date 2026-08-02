import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { WorkflowController } from "../controllers/WorkflowController.js";

export interface WorkflowRoutesDependencies {
  workflowController: WorkflowController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/workflows` (ver modules/workflow/container.ts). RBAC: ver ADR 0029. */
export function createWorkflowRouter(deps: WorkflowRoutesDependencies): Router {
  const router = Router();
  const controller = deps.workflowController;

  router.post(
    "/",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.createDefinition),
  );
  router.get("/", deps.authenticate, deps.authorizeRead, asyncHandler(controller.listDefinitions));
  router.get("/:id", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getDefinition));
  router.post(
    "/:id/instances",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.startInstance),
  );

  return router;
}

/** Montado em `/api/v1/workflow-instances` (ver modules/workflow/container.ts). RBAC: ver ADR 0029. */
export function createWorkflowInstanceRouter(deps: WorkflowRoutesDependencies): Router {
  const router = Router();
  const controller = deps.workflowController;

  router.get("/:id", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getInstance));
  router.post(
    "/:id/trigger",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.triggerTransition),
  );

  return router;
}
