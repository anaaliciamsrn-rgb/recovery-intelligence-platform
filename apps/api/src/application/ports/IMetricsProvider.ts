export interface IMetricsProvider {
  readonly contentType: string;
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void;
  getMetrics(): Promise<string>;
}
