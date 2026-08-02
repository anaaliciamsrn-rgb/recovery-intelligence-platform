import { AppError } from "../../../../application/errors/AppError.js";
import type { FeatureFlag } from "../../domain/entities/FeatureFlag.js";
import type { FeatureFlagOverride } from "../../domain/entities/FeatureFlagOverride.js";
import type { IFeatureFlagOverrideRepository } from "../../domain/repositories/IFeatureFlagOverrideRepository.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";

export interface FeatureFlagDetail {
  flag: FeatureFlag;
  overrides: FeatureFlagOverride[];
}

export class GetFeatureFlagUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly featureFlagOverrideRepository: IFeatureFlagOverrideRepository,
  ) {}

  async execute(chave: string): Promise<FeatureFlagDetail> {
    const flag = await this.featureFlagRepository.findByChave(chave);
    if (!flag) {
      throw new AppError("NOT_FOUND", "Flag não encontrada");
    }

    const overrides = await this.featureFlagOverrideRepository.findByFeatureFlagId(flag.id);
    return { flag, overrides };
  }
}
