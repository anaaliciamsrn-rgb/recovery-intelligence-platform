import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";
import type { ProcessMetrics } from "@rip/shared-types";
import type { IProcessMetricsProvider } from "../../application/ports/IProcessMetricsProvider.js";

const BYTES_PER_MB = 1024 * 1024;
const NS_PER_MS = 1e6;
const CPU_SAMPLE_INTERVAL_MS = 1000;

function toMb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 100) / 100;
}

function nsToMs(nanoseconds: number): number {
  // O histograma pode não ter nenhuma amostra ainda nos primeiros
  // milissegundos após o boot, retornando NaN — JSON.stringify(NaN) vira
  // `null`, o que quebraria o contrato tipado como `number`.
  if (!Number.isFinite(nanoseconds)) return 0;
  return Math.round((nanoseconds / NS_PER_MS) * 100) / 100;
}

/**
 * Introspecção do processo Node: memória (`process.memoryUsage`), atraso do
 * event loop (histograma nativo `perf_hooks.monitorEventLoopDelay`) e uso de
 * CPU. `process.cpuUsage()` só dá tempo de CPU cumulativo, não uma
 * porcentagem — por isso uma amostragem em background (a cada 1s) calcula o
 * delta e expõe o último valor computado, para `collect()` ser instantâneo
 * (sem adicionar latência ao `/health`).
 *
 * `dispose()` deve ser chamado no shutdown (ver main.ts) para o
 * `setInterval` não impedir o processo de encerrar.
 */
export class ProcessMetricsProvider implements IProcessMetricsProvider {
  private readonly eventLoopDelayHistogram: IntervalHistogram;
  private readonly cpuSampleInterval: NodeJS.Timeout;
  private lastCpuUsage = process.cpuUsage();
  private lastSampleAt = process.hrtime.bigint();
  private cpuUsagePercent = 0;

  constructor() {
    this.eventLoopDelayHistogram = monitorEventLoopDelay({ resolution: 10 });
    this.eventLoopDelayHistogram.enable();

    this.cpuSampleInterval = setInterval(() => this.sampleCpuUsage(), CPU_SAMPLE_INTERVAL_MS);
    this.cpuSampleInterval.unref();
  }

  collect(): ProcessMetrics {
    const memory = process.memoryUsage();

    return {
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: toMb(memory.rss),
        heapUsedMb: toMb(memory.heapUsed),
        heapTotalMb: toMb(memory.heapTotal),
        externalMb: toMb(memory.external),
      },
      eventLoopDelay: {
        meanMs: nsToMs(this.eventLoopDelayHistogram.mean),
        p99Ms: nsToMs(this.eventLoopDelayHistogram.percentile(99)),
      },
      cpuUsagePercent: this.cpuUsagePercent,
    };
  }

  dispose(): void {
    clearInterval(this.cpuSampleInterval);
    this.eventLoopDelayHistogram.disable();
  }

  private sampleCpuUsage(): void {
    const usageSinceLastSample = process.cpuUsage(this.lastCpuUsage);
    const now = process.hrtime.bigint();
    const elapsedMs = Number(now - this.lastSampleAt) / NS_PER_MS;
    const cpuTimeMs = (usageSinceLastSample.user + usageSinceLastSample.system) / 1000;

    this.cpuUsagePercent =
      elapsedMs > 0 ? Math.round((cpuTimeMs / elapsedMs) * 100 * 100) / 100 : 0;

    this.lastCpuUsage = process.cpuUsage();
    this.lastSampleAt = now;
  }
}
