import type { IClock } from "../../../src/modules/dossier-versioning/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/dossier-versioning/application/ports/IIdGenerator.js";
import type { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import type { IVersionSnapshotRepository } from "../../../src/modules/dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";

export class FakeVersionSnapshotRepository implements IVersionSnapshotRepository {
  private readonly snapshotsById = new Map<string, VersionSnapshot>();

  async save(snapshot: VersionSnapshot): Promise<void> {
    this.snapshotsById.set(snapshot.id, snapshot);
  }

  async findLatestVersionNumber(dossieId: string): Promise<number | null> {
    const versoes = [...this.snapshotsById.values()]
      .filter((s) => s.dossieId === dossieId)
      .map((s) => s.versao);
    return versoes.length > 0 ? Math.max(...versoes) : null;
  }

  async findByDossieId(dossieId: string): Promise<VersionSnapshot[]> {
    return [...this.snapshotsById.values()]
      .filter((s) => s.dossieId === dossieId)
      .sort((a, b) => a.versao - b.versao);
  }

  async findByDossieIdAndVersion(
    dossieId: string,
    versao: number,
  ): Promise<VersionSnapshot | null> {
    return (
      [...this.snapshotsById.values()].find(
        (s) => s.dossieId === dossieId && s.versao === versao,
      ) ?? null
    );
  }

  async findLatestPerDossie(): Promise<VersionSnapshot[]> {
    const porDossie = new Map<string, VersionSnapshot>();
    for (const snapshot of this.snapshotsById.values()) {
      const atual = porDossie.get(snapshot.dossieId);
      if (!atual || snapshot.versao > atual.versao) porDossie.set(snapshot.dossieId, snapshot);
    }
    return [...porDossie.values()];
  }

  async findAll(): Promise<VersionSnapshot[]> {
    return [...this.snapshotsById.values()].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  seed(snapshot: VersionSnapshot): void {
    this.snapshotsById.set(snapshot.id, snapshot);
  }

  async deleteByDossieIds(dossieIds: string[]): Promise<void> {
    const idSet = new Set(dossieIds);
    for (const [id, snapshot] of this.snapshotsById) {
      if (idSet.has(snapshot.dossieId)) this.snapshotsById.delete(id);
    }
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
