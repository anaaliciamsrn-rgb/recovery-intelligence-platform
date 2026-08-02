import { AppError } from "../../../../application/errors/AppError.js";
import { FeatureFlag, InvalidFeatureFlagError } from "../../domain/entities/FeatureFlag.js";
import type { IFeatureFlagRepository } from "../../domain/repositories/IFeatureFlagRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateFeatureFlagInput {
  chave: string;
  descricao: string | null;
  ativoPadrao: boolean;
}

/** Cria uma flag nova — chave precisa ser única (nenhum módulo pode ter dois interruptores para a mesma coisa). Ver ADR 0031. */
export class CreateFeatureFlagUseCase {
  constructor(
    private readonly featureFlagRepository: IFeatureFlagRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
    const existente = await this.featureFlagRepository.findByChave(input.chave);
    if (existente) {
      throw new AppError("CONFLICT", `Já existe uma flag com a chave "${input.chave}"`);
    }

    const now = this.clock.now();
    let flag: FeatureFlag;
    try {
      flag = FeatureFlag.create({
        id: this.idGenerator.generateId(),
        chave: input.chave,
        descricao: input.descricao,
        ativoPadrao: input.ativoPadrao,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidFeatureFlagError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.featureFlagRepository.save(flag);
    return flag;
  }
}
