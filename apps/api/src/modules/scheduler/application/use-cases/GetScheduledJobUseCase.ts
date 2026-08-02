import { AppError } from "../../../../application/errors/AppError.js";
import type { JobExecutionEntry } from "../../domain/entities/JobExecutionEntry.js";
import type { ScheduledJob } from "../../domain/entities/ScheduledJob.js";
import type { IJobExecutionRepository } from "../../domain/repositories/IJobExecutionRepository.js";
import type { IScheduledJobRepository } from "../../domain/repositories/IScheduledJobRepository.js";

export interface ScheduledJobDetail {
  job: ScheduledJob;
  execucoes: JobExecutionEntry[];
}

export class GetScheduledJobUseCase {
  constructor(
    private readonly scheduledJobRepository: IScheduledJobRepository,
    private readonly jobExecutionRepository: IJobExecutionRepository,
  ) {}

  async execute(scheduledJobId: string): Promise<ScheduledJobDetail> {
    const job = await this.scheduledJobRepository.findById(scheduledJobId);
    if (!job) {
      throw new AppError("NOT_FOUND", "Job não encontrado");
    }

    const execucoes = await this.jobExecutionRepository.findByScheduledJobId(scheduledJobId);
    return { job, execucoes };
  }
}
