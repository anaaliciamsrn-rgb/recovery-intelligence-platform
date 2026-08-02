import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { RuleBuilderController } from "../controllers/RuleBuilderController.js";

export interface RuleBuilderRoutesDependencies {
  ruleBuilderController: RuleBuilderController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/rules` (ver modules/rule-builder/container.ts). RBAC: ver ADR 0029/0030. */
export function createRuleBuilderRouter(deps: RuleBuilderRoutesDependencies): Router {
  const router = Router();
  const controller = deps.ruleBuilderController;

  router.post("/", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.create));
  router.get("/", deps.authenticate, deps.authorizeRead, asyncHandler(controller.list));
  router.get("/:id", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getById));
  router.patch("/:id", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.update));
  router.post(
    "/evaluate",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(controller.evaluate),
  );

  return router;
}
