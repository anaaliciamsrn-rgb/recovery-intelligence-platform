import type { IClock } from "../../../src/modules/explainability/application/ports/IClock.js";

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
