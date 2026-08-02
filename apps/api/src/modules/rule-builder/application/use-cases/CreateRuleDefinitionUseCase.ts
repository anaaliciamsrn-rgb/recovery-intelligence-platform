import { AppError } from "../../../../application/errors/AppError.js";
import {
  InvalidRuleDefinitionError,
  RuleDefinition,
} from "../../domain/entities/RuleDefinition.js";
import { RuleVersionEntry } from "../../domain/entities/RuleVersionEntry.js";
import type { IRuleDefinitionRepository } from "../../domain/repositories/IRuleDefinitionRepository.js";
import type { IRuleVersionRepository } from "../../domain/repositories/IRuleVersionRepository.js";
import type { RuleCondition } from "../../domain/value-objects/RuleCondition.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateRuleDefinitionInput {
  nome: string;
  descricao: string | null;
  recurso: string;
  condicoes: RuleCondition[];
  peso: number;
  prioridade: number;
  acao: string;
  ativo: boolean;
}

/** Cria uma regra nova — sempre nasce na versão 1, com sua própria entrada de histórico. Ver ADR 0030. */
export class CreateRuleDefinitionUseCase {
  constructor(
    private readonly ruleDefinitionRepository: IRuleDefinitionRepository,
    private readonly ruleVersionRepository: IRuleVersionRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateRuleDefinitionInput): Promise<RuleDefinition> {
    const now = this.clock.now();

    let regra: RuleDefinition;
    try {
      regra = RuleDefinition.create({
        id: this.idGenerator.generateId(),
        nome: input.nome,
        descricao: input.descricao,
        recurso: input.recurso,
        condicoes: input.condicoes,
        peso: input.peso,
        prioridade: input.prioridade,
        acao: input.acao,
        ativo: input.ativo,
        versaoAtual: 1,
        createdAt: now,
        updatedAt: now,
      });
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
        versao: 1,
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
