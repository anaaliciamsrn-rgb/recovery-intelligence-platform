import { AppError } from "../../../../application/errors/AppError.js";
import {
  InvalidRuleDefinitionError,
  type RuleDefinition,
} from "../../domain/entities/RuleDefinition.js";
import { RuleVersionEntry } from "../../domain/entities/RuleVersionEntry.js";
import type { IRuleDefinitionRepository } from "../../domain/repositories/IRuleDefinitionRepository.js";
import type { IRuleVersionRepository } from "../../domain/repositories/IRuleVersionRepository.js";
import type { RuleCondition } from "../../domain/value-objects/RuleCondition.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface UpdateRuleDefinitionInput {
  ruleDefinitionId: string;
  nome: string;
  descricao: string | null;
  condicoes: RuleCondition[];
  peso: number;
  prioridade: number;
  acao: string;
  ativo: boolean;
}

/** Revisa uma regra existente — nunca sobrescreve a versão anterior, sempre soma uma nova entrada ao histórico. Ver ADR 0030. */
export class UpdateRuleDefinitionUseCase {
  constructor(
    private readonly ruleDefinitionRepository: IRuleDefinitionRepository,
    private readonly ruleVersionRepository: IRuleVersionRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: UpdateRuleDefinitionInput): Promise<RuleDefinition> {
    const regra = await this.ruleDefinitionRepository.findById(input.ruleDefinitionId);
    if (!regra) {
      throw new AppError("NOT_FOUND", "Regra não encontrada");
    }

    const now = this.clock.now();
    try {
      regra.revisar(
        {
          nome: input.nome,
          descricao: input.descricao,
          condicoes: input.condicoes,
          peso: input.peso,
          prioridade: input.prioridade,
          acao: input.acao,
          ativo: input.ativo,
        },
        now,
      );
    } catch (error) {
      if (error instanceof InvalidRuleDefinitionError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.ruleDefinitionRepository.save(regra);
    await this.ruleVersionRepository.append(
      RuleVersionEntry.create({
        id: this.idGenerator.generateId(),
        ruleDefinitionId: regra.id,
        versao: regra.versaoAtual,
        nome: regra.nome,
        descricao: regra.descricao,
        recurso: regra.recurso,
        condicoes: regra.condicoes,
        peso: regra.peso,
        prioridade: regra.prioridade,
        acao: regra.acao,
        ativo: regra.ativo,
        criadoEm: now,
      }),
    );

    return regra;
  }
}
