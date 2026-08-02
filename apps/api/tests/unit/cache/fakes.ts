import type { ICacheStore } from "../../../src/modules/cache/application/ports/ICacheStore.js";

interface Entry {
  value: string;
  expiresAt: number;
}

/** Store em memória — só para testes de use case; TTL é simulado com `Date.now()`, nunca com timers reais. */
export class FakeCacheStore implements ICacheStore {
  private readonly entries = new Map<string, Entry>();
  private readonly counters = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<number> {
    return this.entries.delete(key) ? 1 : 0;
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let removidas = 0;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        removidas += 1;
      }
    }
    return removidas;
  }

  async getTtlSeconds(key: string): Promise<number | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async incrementCounter(key: string): Promise<number> {
    const proximo = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, proximo);
    return proximo;
  }

  async getCounter(key: string): Promise<number> {
    return this.counters.get(key) ?? 0;
  }
}
