import type { IClock } from "../../../src/modules/scheduler/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/scheduler/application/ports/IIdGenerator.js";
import type {
  IJobHandler,
  IJobHandlerRegistry,
} from "../../../src/modules/scheduler/application/ports/IJobHandlerRegistry.js";
import type { JobExecutionEntry } from "../../../src/modules/scheduler/domain/entities/JobExecutionEntry.js";
import type { ScheduledJob } from "../../../src/modules/scheduler/domain/entities/ScheduledJob.js";
import type { IJobExecutionRepository } from "../../../src/modules/scheduler/domain/repositories/IJobExecutionRepository.js";
import type {
  IScheduledJobRepository,
  ScheduledJobFilter,
  ScheduledJobPage,
  ScheduledJobPagination,
} from "../../../src/modules/scheduler/domain/repositories/IScheduledJobRepository.js";
import { ScheduledJobStatus } from "../../../src/modules/scheduler/domain/value-objects/ScheduledJobStatus.js";

export class FakeScheduledJobRepository implements IScheduledJobRepository {
  private readonly jobsById = new Map<string, ScheduledJob>();

  async findById(id: string): Promise<ScheduledJob | null> {
    return this.jobsById.get(id) ?? null;
  }

  async findAll(filter?: ScheduledJobFilter): Promise<ScheduledJob[]> {
    return [...this.jobsById.values()].filter(
      (job) => filter?.status === undefined || job.status === filter.status,
    );
  }

  async findMany(
    filter: ScheduledJobFilter,
    pagination: ScheduledJobPagination,
  ): Promise<ScheduledJobPage> {
    const todos = await this.findAll(filter);
    const inicio = (pagination.page - 1) * pagination.pageSize;
    return {
      items: todos.slice(inicio, inicio + pagination.pageSize),
      total: todos.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    return [...this.jobsById.values()]
      .filter(
        (job) =>
          job.status === ScheduledJobStatus.PENDENTE && job.agendadoPara.getTime() <= now.getTime(),
      )
      .sort((a, b) => a.agendadoPara.getTime() - b.agendadoPara.getTime())
      .slice(0, limit);
  }

  async save(job: ScheduledJob): Promise<void> {
    this.jobsById.set(job.id, job);
  }
}

export class FakeJobExecutionRepository implements IJobExecutionRepository {
  private readonly entries: JobExecutionEntry[] = [];

  async append(entrada: JobExecutionEntry): Promise<void> {
    this.entries.push(entrada);
  }

  async findByScheduledJobId(scheduledJobId: string): Promise<JobExecutionEntry[]> {
    return this.entries.filter((entrada) => entrada.scheduledJobId === scheduledJobId);
  }
}

export class FakeJobHandlerRegistry implements IJobHandlerRegistry {
  private readonly handlersByTipo = new Map<string, IJobHandler>();

  register(tipo: string, handler: IJobHandler): void {
    this.handlersByTipo.set(tipo, handler);
  }

  resolve(tipo: string): IJobHandler | null {
    return this.handlersByTipo.get(tipo) ?? null;
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
