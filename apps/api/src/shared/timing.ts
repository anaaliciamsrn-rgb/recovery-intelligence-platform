import { performance } from "node:perf_hooks";

/** Milissegundos decorridos desde `startedAt` (obtido via `performance.now()`), com 2 casas decimais. */
export function elapsedMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

export function now(): number {
  return performance.now();
}
