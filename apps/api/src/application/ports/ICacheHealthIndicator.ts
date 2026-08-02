import type { DependencyHealth } from "@rip/shared-types";

export interface ICacheHealthIndicator {
  check(): Promise<DependencyHealth>;
}
