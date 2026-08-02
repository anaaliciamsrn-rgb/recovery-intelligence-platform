import type { IClock } from "../../../src/modules/feature-flags/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/feature-flags/application/ports/IIdGenerator.js";
import type { FeatureFlag } from "../../../src/modules/feature-flags/domain/entities/FeatureFlag.js";
import type { FeatureFlagOverride } from "../../../src/modules/feature-flags/domain/entities/FeatureFlagOverride.js";
import type { IFeatureFlagOverrideRepository } from "../../../src/modules/feature-flags/domain/repositories/IFeatureFlagOverrideRepository.js";
import type {
  FeatureFlagPage,
  FeatureFlagPagination,
  IFeatureFlagRepository,
} from "../../../src/modules/feature-flags/domain/repositories/IFeatureFlagRepository.js";
import type { FeatureFlagScopeType } from "../../../src/modules/feature-flags/domain/value-objects/FeatureFlagScope.js";

export class FakeFeatureFlagRepository implements IFeatureFlagRepository {
  private readonly flagsById = new Map<string, FeatureFlag>();

  async findById(id: string): Promise<FeatureFlag | null> {
    return this.flagsById.get(id) ?? null;
  }

  async findByChave(chave: string): Promise<FeatureFlag | null> {
    return [...this.flagsById.values()].find((flag) => flag.chave === chave) ?? null;
  }

  async findAll(): Promise<FeatureFlag[]> {
    return [...this.flagsById.values()];
  }

  async findMany(pagination: FeatureFlagPagination): Promise<FeatureFlagPage> {
    const todas = [...this.flagsById.values()].sort((a, b) => a.chave.localeCompare(b.chave));
    const inicio = (pagination.page - 1) * pagination.pageSize;
    return {
      items: todas.slice(inicio, inicio + pagination.pageSize),
      total: todas.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async save(flag: FeatureFlag): Promise<void> {
    this.flagsById.set(flag.id, flag);
  }
}

export class FakeFeatureFlagOverrideRepository implements IFeatureFlagOverrideRepository {
  private readonly overrides: FeatureFlagOverride[] = [];

  async findByFeatureFlagId(featureFlagId: string): Promise<FeatureFlagOverride[]> {
    return this.overrides.filter((o) => o.featureFlagId === featureFlagId);
  }

  async findOne(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<FeatureFlagOverride | null> {
    return (
      this.overrides.find(
        (o) =>
          o.featureFlagId === featureFlagId &&
          o.escopoTipo === escopoTipo &&
          o.escopoValor === escopoValor,
      ) ?? null
    );
  }

  async save(override: FeatureFlagOverride): Promise<void> {
    const index = this.overrides.findIndex((o) => o.id === override.id);
    if (index >= 0) {
      this.overrides[index] = override;
    } else {
      this.overrides.push(override);
    }
  }

  async remove(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<void> {
    const index = this.overrides.findIndex(
      (o) =>
        o.featureFlagId === featureFlagId &&
        o.escopoTipo === escopoTipo &&
        o.escopoValor === escopoValor,
    );
    if (index >= 0) {
      this.overrides.splice(index, 1);
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
