import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import type { Redis } from "ioredis";
import type { ILogger } from "../../application/ports/ILogger.js";
import { Argon2PasswordHasher } from "../../infrastructure/security/argon2-password-hasher.js";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import { createRateLimitMiddleware } from "../../presentation/http/middlewares/rate-limit.middleware.js";
import type { Env } from "../../shared/config/env.js";
import type { IdentityModuleConfig } from "./application/IdentityModuleConfig.js";
import type { IOAuthProvider } from "./application/ports/IOAuthProvider.js";
import { AssignUserRolesUseCase } from "./application/use-cases/AssignUserRolesUseCase.js";
import { ChangePasswordUseCase } from "./application/use-cases/ChangePasswordUseCase.js";
import { ListActiveSessionsUseCase } from "./application/use-cases/ListActiveSessionsUseCase.js";
import { ListUsersUseCase } from "./application/use-cases/ListUsersUseCase.js";
import { GetCurrentUserUseCase } from "./application/use-cases/GetCurrentUserUseCase.js";
import { LoginUseCase } from "./application/use-cases/LoginUseCase.js";
import { LogoutAllSessionsUseCase } from "./application/use-cases/LogoutAllSessionsUseCase.js";
import { LogoutUseCase } from "./application/use-cases/LogoutUseCase.js";
import { OAuthLoginUseCase } from "./application/use-cases/OAuthLoginUseCase.js";
import { RefreshTokenUseCase } from "./application/use-cases/RefreshTokenUseCase.js";
import { RegisterUseCase } from "./application/use-cases/RegisterUseCase.js";
import { RequestPasswordResetUseCase } from "./application/use-cases/RequestPasswordResetUseCase.js";
import { ResetPasswordUseCase } from "./application/use-cases/ResetPasswordUseCase.js";
import { RevokeSessionUseCase } from "./application/use-cases/RevokeSessionUseCase.js";
import { UpdateProfileUseCase } from "./application/use-cases/UpdateProfileUseCase.js";
import { ConsoleEmailProvider } from "./infrastructure/email/ConsoleEmailProvider.js";
import { SMTPEmailProvider } from "./infrastructure/email/SMTPEmailProvider.js";
import { GoogleOAuthProvider } from "./infrastructure/oauth/GoogleOAuthProvider.js";
import { MicrosoftOAuthProvider } from "./infrastructure/oauth/MicrosoftOAuthProvider.js";
import { PrismaAuditLogRepository } from "./infrastructure/persistence/PrismaAuditLogRepository.js";
import { PrismaPasswordResetTokenRepository } from "./infrastructure/persistence/PrismaPasswordResetTokenRepository.js";
import { PrismaSessionRepository } from "./infrastructure/persistence/PrismaSessionRepository.js";
import { PrismaUserRepository } from "./infrastructure/persistence/PrismaUserRepository.js";
import { RedisLoginAttemptTracker } from "./infrastructure/rate-limiting/RedisLoginAttemptTracker.js";
import { CryptoIdGenerator } from "./infrastructure/security/CryptoIdGenerator.js";
import { Sha256TokenHasher } from "./infrastructure/security/Sha256TokenHasher.js";
import { SystemClock } from "./infrastructure/security/SystemClock.js";
import { AuthController } from "./presentation/controllers/AuthController.js";
import {
  OAuthController,
  type OAuthProviderName,
} from "./presentation/controllers/OAuthController.js";
import { ProfileController } from "./presentation/controllers/ProfileController.js";
import { SessionController } from "./presentation/controllers/SessionController.js";
import { UserAdminController } from "./presentation/controllers/UserAdminController.js";
import { createIdentityRouter } from "./presentation/routes/auth.routes.js";

export interface IdentityModuleDependencies {
  prisma: PrismaClient;
  redis: Redis;
  logger: ILogger;
  env: Env;
}

export interface IdentityModule {
  router: Router;
}

/**
 * Composition root do módulo: único lugar (junto com o container raiz) que
 * conhece tanto os ports do módulo quanto suas implementações concretas.
 * O container raiz só recebe o `router` de volta — nunca as peças internas.
 */
export function buildIdentityModule(deps: IdentityModuleDependencies): IdentityModule {
  const { prisma, redis, logger, env } = deps;

  const config: IdentityModuleConfig = {
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    accountLockoutThreshold: env.ACCOUNT_LOCKOUT_THRESHOLD,
    accountLockoutDurationSeconds: env.ACCOUNT_LOCKOUT_DURATION_SECONDS,
  };

  const passwordHasher = new Argon2PasswordHasher(env);
  const tokenProvider = new JwtTokenProvider(env);
  const tokenHasher = new Sha256TokenHasher();
  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();
  const loginAttemptTracker = new RedisLoginAttemptTracker(
    redis,
    env.ACCOUNT_LOCKOUT_THRESHOLD,
    env.ACCOUNT_LOCKOUT_DURATION_SECONDS,
  );

  const userRepository = new PrismaUserRepository(prisma);
  const sessionRepository = new PrismaSessionRepository(prisma);
  const auditLogRepository = new PrismaAuditLogRepository(prisma);
  const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository(prisma);

  // Sem SMTP_HOST configurado, cai no ConsoleEmailProvider — nunca falha
  // silenciosamente, nunca finge enviar (ver ADR 0037).
  const emailProvider = env.SMTP_HOST
    ? new SMTPEmailProvider(
        {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          user: env.SMTP_USER,
          password: env.SMTP_PASSWORD,
          from: env.SMTP_FROM,
        },
        logger,
      )
    : new ConsoleEmailProvider(logger);

  const loginUseCase = new LoginUseCase(
    userRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
    tokenProvider,
    tokenHasher,
    loginAttemptTracker,
    idGenerator,
    clock,
    config,
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    sessionRepository,
    userRepository,
    auditLogRepository,
    tokenProvider,
    tokenHasher,
    idGenerator,
    clock,
    config,
  );

  const logoutUseCase = new LogoutUseCase(
    sessionRepository,
    auditLogRepository,
    idGenerator,
    tokenHasher,
    clock,
  );

  const logoutAllSessionsUseCase = new LogoutAllSessionsUseCase(
    sessionRepository,
    auditLogRepository,
    idGenerator,
    clock,
  );

  const revokeSessionUseCase = new RevokeSessionUseCase(
    sessionRepository,
    auditLogRepository,
    idGenerator,
    clock,
  );

  const listActiveSessionsUseCase = new ListActiveSessionsUseCase(sessionRepository);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

  const registerUseCase = new RegisterUseCase(
    userRepository,
    auditLogRepository,
    passwordHasher,
    idGenerator,
    clock,
  );

  const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetTokenRepository,
    auditLogRepository,
    emailProvider,
    tokenHasher,
    idGenerator,
    clock,
    env.APP_URL,
    env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
  );

  const resetPasswordUseCase = new ResetPasswordUseCase(
    userRepository,
    passwordResetTokenRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
    tokenHasher,
    idGenerator,
    clock,
  );

  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const assignUserRolesUseCase = new AssignUserRolesUseCase(
    userRepository,
    auditLogRepository,
    idGenerator,
    clock,
  );

  const updateProfileUseCase = new UpdateProfileUseCase(
    userRepository,
    auditLogRepository,
    idGenerator,
    clock,
  );
  const changePasswordUseCase = new ChangePasswordUseCase(
    userRepository,
    auditLogRepository,
    passwordHasher,
    idGenerator,
    clock,
  );

  const oauthProviders: Partial<Record<OAuthProviderName, IOAuthProvider>> = {};
  if (
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_OAUTH_REDIRECT_URI
  ) {
    oauthProviders.google = new GoogleOAuthProvider({
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    });
  }
  if (
    env.MICROSOFT_OAUTH_CLIENT_ID &&
    env.MICROSOFT_OAUTH_CLIENT_SECRET &&
    env.MICROSOFT_OAUTH_REDIRECT_URI
  ) {
    oauthProviders.microsoft = new MicrosoftOAuthProvider({
      clientId: env.MICROSOFT_OAUTH_CLIENT_ID,
      clientSecret: env.MICROSOFT_OAUTH_CLIENT_SECRET,
      redirectUri: env.MICROSOFT_OAUTH_REDIRECT_URI,
      tenantId: env.MICROSOFT_OAUTH_TENANT_ID,
    });
  }

  const oauthLoginUseCase = new OAuthLoginUseCase(
    userRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
    tokenProvider,
    tokenHasher,
    idGenerator,
    clock,
    config,
  );

  const cookieConfig = {
    name: env.REFRESH_TOKEN_COOKIE_NAME,
    secure: env.COOKIE_SECURE,
    maxAgeMs: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  };

  const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    logoutAllSessionsUseCase,
    getCurrentUserUseCase,
    registerUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    cookieConfig,
  );

  const sessionController = new SessionController(listActiveSessionsUseCase, revokeSessionUseCase);
  const profileController = new ProfileController(updateProfileUseCase, changePasswordUseCase);
  const oauthController = new OAuthController(
    oauthProviders,
    oauthLoginUseCase,
    cookieConfig,
    env.APP_URL,
  );
  const userAdminController = new UserAdminController(listUsersUseCase, assignUserRolesUseCase);

  const loginRateLimitMiddleware = createRateLimitMiddleware(redis, {
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
    max: env.LOGIN_RATE_LIMIT_MAX_REQUESTS,
    keyPrefix: "rl:login:",
  });

  const router = createIdentityRouter({
    authController,
    sessionController,
    profileController,
    oauthController,
    userAdminController,
    tokenProvider,
    loginRateLimitMiddleware,
  });

  logger.info("identity_module_ready", {
    oauthProvidersConfigured: Object.keys(oauthProviders),
    emailProvider: env.SMTP_HOST ? "smtp" : "console",
  });

  return { router };
}
