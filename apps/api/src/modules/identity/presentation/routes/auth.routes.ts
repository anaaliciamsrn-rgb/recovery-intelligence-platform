import { Router, type RequestHandler } from "express";
import type { ITokenProvider } from "../../../../application/ports/ITokenProvider.js";
import { asyncHandler } from "../../../../shared/async-handler.js";
import { Permission } from "../../domain/value-objects/Permission.js";
import type { AuthController } from "../controllers/AuthController.js";
import type { OAuthController } from "../controllers/OAuthController.js";
import type { ProfileController } from "../controllers/ProfileController.js";
import type { SessionController } from "../controllers/SessionController.js";
import type { UserAdminController } from "../controllers/UserAdminController.js";
import { createAuthenticateMiddleware } from "../middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../middlewares/authorize.middleware.js";

export interface IdentityRoutesDependencies {
  authController: AuthController;
  sessionController: SessionController;
  profileController: ProfileController;
  oauthController: OAuthController;
  userAdminController: UserAdminController;
  tokenProvider: ITokenProvider;
  /** Instância própria, mais estrita que o rate limit global — ver ADR 0010. */
  loginRateLimitMiddleware: RequestHandler;
}

/**
 * Montado em `/api/v1/auth` pelo app.ts raiz (ver modules/identity/container.ts).
 * A única checagem de RBAC não trivial pré-existente (revogar sessão de
 * outra pessoa) é composta com ownership e por isso vive dentro do use case
 * (RevokeSessionUseCase). `identity:manage-users` abaixo é a primeira rota
 * deste módulo que usa `authorizeMiddleware` de fato — gestão de usuários é
 * checagem estática de papel, sem componente de ownership.
 */
export function createIdentityRouter(deps: IdentityRoutesDependencies): Router {
  const router = Router();
  const authenticate = createAuthenticateMiddleware(deps.tokenProvider);
  const requireManageUsers = createAuthorizeMiddleware(Permission.MANAGE_USERS);

  router.post("/login", deps.loginRateLimitMiddleware, asyncHandler(deps.authController.login));
  router.post(
    "/register",
    deps.loginRateLimitMiddleware,
    asyncHandler(deps.authController.register),
  );
  router.post("/refresh", asyncHandler(deps.authController.refresh));
  router.post("/logout", asyncHandler(deps.authController.logout));
  router.post("/logout-all", authenticate, asyncHandler(deps.authController.logoutAll));
  router.get("/me", authenticate, asyncHandler(deps.authController.getCurrentUser));

  router.post(
    "/forgot-password",
    deps.loginRateLimitMiddleware,
    asyncHandler(deps.authController.requestPasswordReset),
  );
  router.post(
    "/reset-password",
    deps.loginRateLimitMiddleware,
    asyncHandler(deps.authController.resetPassword),
  );

  router.patch("/me/profile", authenticate, asyncHandler(deps.profileController.update));
  router.post(
    "/me/change-password",
    authenticate,
    asyncHandler(deps.profileController.changePassword),
  );

  router.get("/oauth/providers", deps.oauthController.listProviders);
  router.get("/oauth/:provider/authorize", deps.oauthController.authorize);
  router.get("/oauth/:provider/callback", asyncHandler(deps.oauthController.callback));

  router.get("/sessions", authenticate, asyncHandler(deps.sessionController.list));
  router.delete("/sessions/:sessionId", authenticate, asyncHandler(deps.sessionController.revoke));

  router.get(
    "/users",
    authenticate,
    requireManageUsers,
    asyncHandler(deps.userAdminController.list),
  );
  router.patch(
    "/users/:id/roles",
    authenticate,
    requireManageUsers,
    asyncHandler(deps.userAdminController.assignRoles),
  );

  return router;
}
