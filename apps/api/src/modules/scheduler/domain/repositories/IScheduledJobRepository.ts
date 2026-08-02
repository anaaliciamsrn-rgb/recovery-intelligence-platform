import type { ScheduledJob } from "../entities/ScheduledJob.js";
import type { ScheduledJobStatus } from "../value-objects/ScheduledJobStatus.js";

export interface ScheduledJobFilter {
  status?: ScheduledJobStatus;
}

export interface ScheduledJobPagination {
  page: number;
  pageSize: number;
}

export interface ScheduledJobPage {
  items: ScheduledJob[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IScheduledJobRepository {
  findById(id: string): Promise<ScheduledJob | null>;
  findAll(filter?: ScheduledJobFilter): Promise<ScheduledJob[]>;
  findMany(
    filter: ScheduledJobFilter,
    pagination: ScheduledJobPagination,
  ): Promise<ScheduledJobPage>;
  /** Jobs PENDENTE cuja `agendadoPara` já passou — a fila de trabalho do próximo `RunDueJobsUseCase`. */
  findDue(now: Date, limit: number): Promise<ScheduledJob[]>;
  save(job: ScheduledJob): Promise<void>;
}
