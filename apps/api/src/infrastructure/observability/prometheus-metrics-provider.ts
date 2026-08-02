import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import type { IMetricsProvider } from "../../application/ports/IMetricsProvider.js";

/**
 * Métricas Prometheus — contador e histograma de duração por
 * `método+rota+status`. `route` deve ser o *padrão* da rota (`/cases/:id`),
 * nunca a URL crua com IDs reais — caso contrário a cardinalidade de séries
 * cresce sem limite (um timeseries por ID já visto). Ver
 * `metrics.middleware.ts`, que extrai `req.route.path` depois do roteamento.
 */
export class PrometheusMetricsProvider implements IMetricsProvider {
  readonly contentType: string;

  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationSeconds: Histogram<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });
    this.contentType = this.registry.contentType;

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total de requisições HTTP, por método, rota e status",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duração das requisições HTTP em segundos, por método, rota e status",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
