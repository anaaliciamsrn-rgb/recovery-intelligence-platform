import type { Redis } from "ioredis";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { Permission } from "../identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../identity/presentation/middlewares/authorize.middleware.js";
import { GetCacheEntryUseCase } from "./application/use-cases/GetCacheEntryUseCase.js";
import { GetCacheStatsUseCase } from "./application/use-cases/GetCacheStatsUseCase.js";
import { InvalidateCacheUseCase } from "./application/use-cases/InvalidateCacheUseCase.js";
import { SetCacheEntryUseCase } from "./application/use-cases/SetCacheEntryUseCase.js";
import { RedisCacheStore } from "./infrastructure/RedisCacheStore.js";
import { CacheController } from "./presentation/controllers/CacheController.js";
import { createCacheRouter } from "./presentation/routes/cache.routes.js";

export interface CacheModuleDependencies {
  redis: Redis;
  env: Env;
}

export interface CacheModule {
  cacheRouter: Router;
}

/** Composition root do módulo. Ver ADR 0033. */
export function buildCacheModule(deps: CacheModuleDependencies): CacheModule {
  const { redis, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);
  const authorizeRead = createAuthorizeMiddleware(Permission.CACHE_READ);
  const authorizeWrite = createAuthorizeMiddleware(Permission.CACHE_WRITE);

  const cacheStore = new RedisCacheStore(redis);

  const setCacheEntryUseCase = new SetCacheEntryUseCase(cacheStore);
  const getCacheEntryUseCase = new GetCacheEntryUseCase(cacheStore);
  const invalidateCacheUseCase = new InvalidateCacheUseCase(cacheStore);
  const getCacheStatsUseCase = new GetCacheStatsUseCase(cacheStore);

  const cacheController = new CacheController(
    setCacheEntryUseCase,
    getCacheEntryUseCase,
    invalidateCacheUseCase,
    getCacheStatsUseCase,
  );
  const cacheRouter = createCacheRouter({
    cacheController,
    authenticate,
    authorizeRead,
    authorizeWrite,
  });

  return { cacheRouter };
}
