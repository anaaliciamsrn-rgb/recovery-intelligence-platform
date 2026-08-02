import type { IClock } from "../../../src/modules/case-management/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/case-management/application/ports/IIdGenerator.js";
import type { Case } from "../../../src/modules/case-management/domain/entities/Case.js";
import type { CaseHistoryEntry } from "../../../src/modules/case-management/domain/entities/CaseHistoryEntry.js";
import type { CaseNote } from "../../../src/modules/case-management/domain/entities/CaseNote.js";
import type {
  CaseFilter,
  CasePage,
  CasePagination,
  ICaseRepository,
} from "../../../src/modules/case-management/domain/repositories/ICaseRepository.js";
import type { ICaseHistoryRepository } from "../../../src/modules/case-management/domain/repositories/ICaseHistoryRepository.js";
import type { ICaseNoteRepository } from "../../../src/modules/case-management/domain/repositories/ICaseNoteRepository.js";

export class FakeCaseRepository implements ICaseRepository {
  private readonly casesById = new Map<string, Case>();

  async findById(id: string): Promise<Case | null> {
    return this.casesById.get(id) ?? null;
  }

  async save(caso: Case): Promise<void> {
    this.casesById.set(caso.id, caso);
  }

  async findMany(filter: CaseFilter, pagination: CasePagination): Promise<CasePage> {
    let items = [...this.casesById.values()];
    if (filter.status) items = items.filter((c) => c.status === filter.status);
    if (filter.ownerId) items = items.filter((c) => c.ownerId === filter.ownerId);
    if (filter.priority) items = items.filter((c) => c.priority === filter.priority);
    if (filter.dossieId) items = items.filter((c) => c.dossieId === filter.dossieId);
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = items.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    return {
      items: items.slice(start, start + pagination.pageSize),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  seed(caso: Case): void {
    this.casesById.set(caso.id, caso);
  }
}

export class FakeCaseNoteRepository implements ICaseNoteRepository {
  private readonly notes: CaseNote[] = [];

  async save(nota: CaseNote): Promise<void> {
    this.notes.push(nota);
  }

  async findByCaseId(caseId: string): Promise<CaseNote[]> {
    return this.notes
      .filter((n) => n.caseId === caseId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class FakeCaseHistoryRepository implements ICaseHistoryRepository {
  private readonly entries: CaseHistoryEntry[] = [];

  async append(entry: CaseHistoryEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByCaseId(caseId: string): Promise<CaseHistoryEntry[]> {
    return this.entries
      .filter((e) => e.caseId === caseId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
