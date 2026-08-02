import { AppError } from "../../../../application/errors/AppError.js";
import type { RuleDefinition } from "../../domain/entities/RuleDefinition.js";
import type { RuleVersionEntry } from "../../domain/entities/RuleVersionEntry.js";
import type { IRuleDefinitionRepository } from "../../domain/repositories/IRuleDefinitionRepository.js";
import type { IRuleVersionRepository } from "../../domain/repositories/IRuleVersionRepository.js";

export interface RuleDefinitionDetail {
  regra: RuleDefinition;
  versoes: RuleVersionEntry[];
}

/** Consulta uma regra com o histórico completo de versões. */
export class GetRuleDefinitionUseCase {
  constructor(
    private readonly ruleDefinitionRepository: IRuleDefinitionRepository,
    private readonly ruleVersionRepository: IRuleVersionRepository,
  ) {}

  async execute(ruleDefinitionId: string): Promise<RuleDefinitionDetail> {
    const regra = await this.ruleDefinitionRepository.findById(ruleDefinitionId);
    if (!regra) {
      throw new AppError("NOT_FOUND", "Regra não encontrada");
    }

    const versoes = await this.ruleVersionRepository.findByRuleDefinitionId(ruleDefinitionId);
    return { regra, versoes };
  }
}
