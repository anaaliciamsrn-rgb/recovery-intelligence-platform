import { Router } from "express";
import type { IMetricsProvider } from "../../../application/ports/IMetricsProvider.js";
import { asyncHandler } from "../../../shared/async-handler.js";

/** Formato de exposição do Prometheus — nunca exige autenticação (é assim que um scraper Prometheus funciona). */
export function createMetricsRouter(provider: IMetricsProvider): Router {
  const router = Router();
  router.get(
    "/metrics",
    asyncHandler(async (_req, res) => {
      res.set("Content-Type", provider.contentType);
      res.status(200).send(await provider.getMetrics());
    }),
  );
  return router;
}
