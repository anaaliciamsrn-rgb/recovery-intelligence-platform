import { type RuleEvaluationResult, RuleEvaluator } from "../../domain/services/RuleEvaluator.js";
import type { IRuleDefinitionRepository } from "../../domain/repositories/IRuleDefinitionRepository.js";

export interface EvaluateRulesInput {
  recurso: string;
  contexto: Record<string, unknown>;
}

/**
 * Avalia as regras ativas de um recurso contra um contexto — o ponto de
 * entrada para qualquer chamador (futuro) que queira decidir algo por
 * regras configuráveis em vez de código. Não é chamado retroativamente
 * pelo motor de classificação hardcoded já aprovado (ver ADR 0030).
 */
export class EvaluateRulesUseCase {
  constructor(private readonly ruleDefinitionRepository: IRuleDefinitionRepository) {}

  async execute(input: EvaluateRulesInput): Promise<RuleEvaluationResult> {
    const regras = await this.ruleDefinitionRepository.findAll({
      recurso: input.recurso,
      ativo: true,
    });
    return RuleEvaluator.avaliar(regras, input.contexto);
  }
}
