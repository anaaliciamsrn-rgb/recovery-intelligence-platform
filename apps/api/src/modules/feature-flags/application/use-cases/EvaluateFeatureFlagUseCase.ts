import { AppError } from "../../../../application/errors/AppError.js";
import {
  type FeatureFlagEvaluationContext,
  type FeatureFlagResolution,
  FeatureFlagResolver,
} from "../../domain/services/FeatureFlagResolver.js";
import type { IFeatureFlagOverrideRepository } from "../../domain/repositories/IFeatureFlagOverrideRepository.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";

export interface EvaluateFeatureFlagInput {
  chave: string;
  contexto: FeatureFlagEvaluationContext;
}

/** Ponto de entrada para qualquer chamador decidir "essa funcionalidade está ativa para este tenant/ambiente/usuário?". Ver ADR 0031. */
export class EvaluateFeatureFlagUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly featureFlagOverrideRepository: IFeatureFlagOverrideRepository,
  ) {}

  async execute(input: EvaluateFeatureFlagInput): Promise<FeatureFlagResolution> {
    const flag = await this.featureFlagRepository.findByChave(input.chave);
    if (!flag) {
      throw new AppError("NOT_FOUND", "Flag não encontrada");
    }

    const overrides = await this.featureFlagOverrideRepository.findByFeatureFlagId(flag.id);
    return FeatureFlagResolver.resolver(flag, overrides, input.contexto);
  }
}
