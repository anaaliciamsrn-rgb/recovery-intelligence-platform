import type { IClock } from "../../../src/modules/rule-builder/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/rule-builder/application/ports/IIdGenerator.js";
import type { RuleDefinition } from "../../../src/modules/rule-builder/domain/entities/RuleDefinition.js";
import type { RuleVersionEntry } from "../../../src/modules/rule-builder/domain/entities/RuleVersionEntry.js";
import type {
  IRuleDefinitionRepository,
  RuleDefinitionFilter,
  RuleDefinitionPage,
  RuleDefinitionPagination,
} from "../../../src/modules/rule-builder/domain/repositories/IRuleDefinitionRepository.js";
import type { IRuleVersionRepository } from "../../../src/modules/rule-builder/domain/repositories/IRuleVersionRepository.js";

export class FakeRuleDefinitionRepository implements IRuleDefinitionRepository {
  private readonly regrasById = new Map<string, RuleDefinition>();

  async findById(id: string): Promise<RuleDefinition | null> {
    return this.regrasById.get(id) ?? null;
  }

  async findAll(filter?: RuleDefinitionFilter): Promise<RuleDefinition[]> {
    return [...this.regrasById.values()].filter(
      (regra) =>
        (filter?.recurso === undefined || regra.recurso === filter.recurso) &&
        (filter?.ativo === undefined || regra.ativo === filter.ativo),
    );
  }

  async findMany(
    filter: RuleDefinitionFilter,
    pagination: RuleDefinitionPagination,
  ): Promise<RuleDefinitionPage> {
    const todas = await this.findAll(filter);
    const inicio = (pagination.page - 1) * pagination.pageSize;
    return {
      items: todas.slice(inicio, inicio + pagination.pageSize),
      total: todas.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async save(regra: RuleDefinition): Promise<void> {
    this.regrasById.set(regra.id, regra);
  }
}

export class FakeRuleVersionRepository implements IRuleVersionRepository {
  private readonly entries: RuleVersionEntry[] = [];

  async append(entrada: RuleVersionEntry): Promise<void> {
    this.entries.push(entrada);
  }

  async findByRuleDefinitionId(ruleDefinitionId: string): Promise<RuleVersionEntry[]> {
    return this.entries
      .filter((entrada) => entrada.ruleDefinitionId === ruleDefinitionId)
      .sort((a, b) => b.versao - a.versao);
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
