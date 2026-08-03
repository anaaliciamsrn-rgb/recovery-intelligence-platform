import type { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../../src/modules/dossie/domain/repositories/IDossieRepository.js";
import type { DossieSubjectType } from "../../../src/modules/dossie/domain/value-objects/DossieSubjectType.js";
import type { IClock } from "../../../src/modules/dossie/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/dossie/application/ports/IIdGenerator.js";

export class FakeDossieRepository implements IDossieRepository {
  private readonly dossiesById = new Map<string, Dossie>();

  async findById(id: string): Promise<Dossie | null> {
    return this.dossiesById.get(id) ?? null;
  }

  async findBySubject(subjectType: DossieSubjectType, subjectId: string): Promise<Dossie | null> {
    const candidatos = [...this.dossiesById.values()]
      .filter((dossie) => dossie.subjectType === subjectType && dossie.subjectId === subjectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidatos[0] ?? null;
  }

  async findManyByIds(ids: string[]): Promise<Dossie[]> {
    return ids.map((id) => this.dossiesById.get(id)).filter((dossie): dossie is Dossie => !!dossie);
  }

  async save(dossie: Dossie): Promise<void> {
    this.dossiesById.set(dossie.id, dossie);
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) this.dossiesById.delete(id);
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
