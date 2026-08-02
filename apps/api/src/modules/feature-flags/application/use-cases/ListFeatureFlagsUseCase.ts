import type {
  FeatureFlagPage,
  FeatureFlagPagination,
  IFeatureFlagRepository,
} from "../../domain/repositories/IFeatureFlagRepository.js";

const DEFAULT_PAGE_SIZE = 50;

export class ListFeatureFlagsUseCase {
  constructor(private readonly featureFlagRepository: IFeatureFlagRepository) {}

  async execute(
    pagination: FeatureFlagPagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  ): Promise<FeatureFlagPage> {
    return this.featureFlagRepository.findMany(pagination);
  }
}
