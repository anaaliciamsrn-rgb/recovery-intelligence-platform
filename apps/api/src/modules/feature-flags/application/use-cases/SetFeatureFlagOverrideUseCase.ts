import { AppError } from "../../../../application/errors/AppError.js";
import {
  FeatureFlagOverride,
  InvalidFeatureFlagOverrideError,
} from "../../domain/entities/FeatureFlagOverride.js";
import type { IFeatureFlagOverrideRepository } from "../../domain/repositories/IFeatureFlagOverrideRepository.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";
import type { FeatureFlagScopeType } from "../../domain/value-objects/FeatureFlagScope.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface SetFeatureFlagOverrideInput {
  chave: string;
  escopoTipo: FeatureFlagScopeType;
  escopoValor: string;
  ativo: boolean;
}

/** Cria ou atualiza (upsert) a exceção da flag para um tenant/ambiente/usuário específico. Ver ADR 0031. */
export class SetFeatureFlagOverrideUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly featureFlagOverrideRepository: IFeatureFlagOverrideRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: SetFeatureFlagOverrideInput): Promise<FeatureFlagOverride> {
    const flag = await this.featureFlagRepository.findByChave(input.chave);
    if (!flag) {
      throw new AppError("NOT_FOUND", "Flag não encontrada");
    }

    const now = this.clock.now();
    const existente = await this.featureFlagOverrideRepository.findOne(
      flag.id,
      input.escopoTipo,
      input.escopoValor,
    );

    if (existente) {
      existente.atualizarAtivo(input.ativo, now);
      await this.featureFlagOverrideRepository.save(existente);
      return existente;
    }

    let override: FeatureFlagOverride;
    try {
      override = FeatureFlagOverride.create({
        id: this.idGenerator.generateId(),
        featureFlagId: flag.id,
        escopoTipo: input.escopoTipo,
        escopoValor: input.escopoValor,
        ativo: input.ativo,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidFeatureFlagOverrideError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.featureFlagOverrideRepository.save(override);
    return override;
  }
}
