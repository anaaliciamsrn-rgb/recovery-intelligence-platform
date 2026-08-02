import type { ProcessMetrics } from "@rip/shared-types";

/**
 * Introspecção do processo Node em execução (uptime, memória, atraso do
 * event loop, uso de CPU). Síncrono: são leituras locais, sem I/O.
 */
export interface IProcessMetricsProvider {
  collect(): ProcessMetrics;
}
