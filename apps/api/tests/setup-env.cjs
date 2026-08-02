process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://rip:rip@localhost:5432/recovery_intelligence_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS ?? "";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS ?? "1000";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test-only-secret-do-not-use-in-production-00000";
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? "60000";
process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS = process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS ?? "1000";
