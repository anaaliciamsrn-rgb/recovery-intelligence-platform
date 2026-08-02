import type {
  IScheduledJobRepository,
  ScheduledJobFilter,
  ScheduledJobPage,
  ScheduledJobPagination,
} from "../../domain/repositories/IScheduledJobRepository.js";

const DEFAULT_PAGE_SIZE = 50;

export class ListScheduledJobsUseCase {
  constructor(private readonly scheduledJobRepository: IScheduledJobRepository) {}

  async execute(
    filter: ScheduledJobFilter = {},
    pagination: ScheduledJobPagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  ): Promise<ScheduledJobPage> {
    return this.scheduledJobRepository.findMany(filter, pagination);
  }
}
