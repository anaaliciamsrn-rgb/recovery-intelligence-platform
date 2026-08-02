import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { IMetricsProvider } from "../../../application/ports/IMetricsProvider.js";

/**
 * Registra método+rota+status+duração de toda requisição. Lê `req.route.path`
 * (o padrão da rota, ex.: `/cases/:id`) só depois do roteamento acontecer —
 * por isso a leitura ocorre no callback de `res.on("finish")`, nunca antes de
 * `next()`. Sem rota casada (404), usa `"unmatched"` em vez da URL crua, para
 * nunca criar uma série de métrica por path inexistente batido por um scanner.
 */
export function metricsMiddleware(provider: IMetricsProvider): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : "unmatched";
      provider.recordHttpRequest(req.method, route, res.statusCode, durationSeconds);
    });

    next();
  };
}
