import { buildContainer } from "./container/index.js";
import { env } from "./shared/config/env.js";

async function main(): Promise<void> {
  const { app, prisma, redis, logger, processMetricsProvider } = buildContainer();

  const server = app.listen(env.PORT, () => {
    logger.info("api_started", { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("shutdown_started", { signal });
    server.close();
    processMetricsProvider.dispose();
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  console.error("Falha ao iniciar a API", error);
  process.exit(1);
});
