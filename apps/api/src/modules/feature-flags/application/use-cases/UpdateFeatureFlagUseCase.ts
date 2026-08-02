import { AppError } from "../../../../application/errors/AppError.js";
import type { FeatureFlag } from "../../domain/entities/FeatureFlag.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";
import type { IClock } from "../ports/IClock.js";

export interface UpdateFeatureFlagInput {
  chave: string;
  descricao: string | null;
  ativoPadrao: boolean;
}

export class UpdateFeatureFlagUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: UpdateFeatureFlagInput): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findByChave(input.chave);
    if (!flag) {
      throw new AppError("NOT_FOUND", "Flag não encontrada");
    }

    flag.atualizar(
      { descricao: input.descricao, ativoPadrao: input.ativoPadrao },
      this.clock.now(),
    );
    await this.featureFlagRepository.save(flag);
    return flag;
  }
}
