import type { JobExecutionEntry } from "../entities/JobExecutionEntry.js";

export interface IJobExecutionRepository {
  append(entrada: JobExecutionEntry): Promise<void>;
  findByScheduledJobId(scheduledJobId: string): Promise<JobExecutionEntry[]>;
}
