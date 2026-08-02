import type { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../../src/modules/dossie/domain/repositories/IDossieRepository.js";
import type { IClock } from "../../../src/modules/dossie/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/dossie/application/ports/IIdGenerator.js";

export class FakeDossieRepository implements IDossieRepository {
  private readonly dossiesById = new Map<string, Dossie>();

  async findById(id: string): Promise<Dossie | null> {
    return this.dossiesById.get(id) ?? null;
  }

  async save(dossie: Dossie): Promise<void> {
    this.dossiesById.set(dossie.id, dossie);
  }

  seed(dossie: Dossie): void {
    this.dossiesById.set(dossie.id, dossie);
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
