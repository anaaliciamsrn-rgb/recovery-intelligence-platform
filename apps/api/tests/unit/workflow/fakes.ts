import type { IClock } from "../../../src/modules/workflow/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/workflow/application/ports/IIdGenerator.js";
import type { WorkflowDefinition } from "../../../src/modules/workflow/domain/entities/WorkflowDefinition.js";
import type { WorkflowInstance } from "../../../src/modules/workflow/domain/entities/WorkflowInstance.js";
import type { WorkflowInstanceHistoryEntry } from "../../../src/modules/workflow/domain/entities/WorkflowInstanceHistoryEntry.js";
import type { IWorkflowDefinitionRepository } from "../../../src/modules/workflow/domain/repositories/IWorkflowDefinitionRepository.js";
import type { IWorkflowInstanceHistoryRepository } from "../../../src/modules/workflow/domain/repositories/IWorkflowInstanceHistoryRepository.js";
import type { IWorkflowInstanceRepository } from "../../../src/modules/workflow/domain/repositories/IWorkflowInstanceRepository.js";

export class FakeWorkflowDefinitionRepository implements IWorkflowDefinitionRepository {
  private readonly definitionsById = new Map<string, WorkflowDefinition>();

  async findById(id: string): Promise<WorkflowDefinition | null> {
    return this.definitionsById.get(id) ?? null;
  }

  async save(definicao: WorkflowDefinition): Promise<void> {
    this.definitionsById.set(definicao.id, definicao);
  }

  async findAll(): Promise<WorkflowDefinition[]> {
    return [...this.definitionsById.values()];
  }

  seed(definicao: WorkflowDefinition): void {
    this.definitionsById.set(definicao.id, definicao);
  }
}

export class FakeWorkflowInstanceRepository implements IWorkflowInstanceRepository {
  private readonly instancesById = new Map<string, WorkflowInstance>();

  async findById(id: string): Promise<WorkflowInstance | null> {
    return this.instancesById.get(id) ?? null;
  }

  async save(instancia: WorkflowInstance): Promise<void> {
    this.instancesById.set(instancia.id, instancia);
  }

  seed(instancia: WorkflowInstance): void {
    this.instancesById.set(instancia.id, instancia);
  }
}

export class FakeWorkflowInstanceHistoryRepository implements IWorkflowInstanceHistoryRepository {
  private readonly entries: WorkflowInstanceHistoryEntry[] = [];

  async append(entry: WorkflowInstanceHistoryEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: string,
  ): Promise<WorkflowInstanceHistoryEntry[]> {
    return this.entries
      .filter((entry) => entry.workflowInstanceId === workflowInstanceId)
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
