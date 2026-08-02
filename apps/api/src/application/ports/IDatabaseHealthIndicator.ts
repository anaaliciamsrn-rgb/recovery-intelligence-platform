import type { DependencyHealth } from "@rip/shared-types";

export interface IDatabaseHealthIndicator {
  check(): Promise<DependencyHealth>;
}
