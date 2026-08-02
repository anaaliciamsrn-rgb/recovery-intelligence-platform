import { AppError } from "../../../../application/errors/AppError.js";
import type { IFeatureFlagOverrideRepository } from "../../domain/repositories/IFeatureFlagOverrideRepository.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";
import type { FeatureFlagScopeType } from "../../domain/value-objects/FeatureFlagScope.js";

export interface RemoveFeatureFlagOverrideInput {
  chave: string;
  escopoTipo: FeatureFlagScopeType;
  escopoValor: string;
}

/** Remove a exceção — o escopo volta a herdar `ativoPadrao` (ou um override mais amplo, ver `FeatureFlagResolver`). */
export class RemoveFeatureFlagOverrideUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly featureFlagOverrideRepository: IFeatureFlagOverrideRepository,
  ) {}

  async execute(input: RemoveFeatureFlagOverrideInput): Promise<void> {
    const flag = await this.featureFlagRepository.findByChave(input.chave);
    if (!flag) {
      throw new AppError("NOT_FOUND", "Flag não encontrada");
    }

    await this.featureFlagOverrideRepository.remove(flag.id, input.escopoTipo, input.escopoValor);
  }
}
