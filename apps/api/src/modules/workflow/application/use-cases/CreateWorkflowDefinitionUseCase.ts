import { AppError } from "../../../../application/errors/AppError.js";
import {
  InvalidWorkflowDefinitionError,
  WorkflowDefinition,
} from "../../domain/entities/WorkflowDefinition.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";
import type { WorkflowCondition } from "../../domain/value-objects/WorkflowCondition.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateWorkflowDefinitionInput {
  nome: string;
  descricao: string | null;
  estados: string[];
  estadoInicial: string;
  transicoes: {
    de: string;
    para: string;
    gatilho: string;
    condicao: WorkflowCondition | null;
    acao: string | null;
  }[];
}

/** Cria um novo fluxo — sem nenhum código novo, só dados. Ver ADR 0027. */
export class CreateWorkflowDefinitionUseCase {
  constructor(
    private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateWorkflowDefinitionInput): Promise<WorkflowDefinition> {
    const now = this.clock.now();

    let definicao: WorkflowDefinition;
    try {
      definicao = WorkflowDefinition.create({
        id: this.idGenerator.generateId(),
        nome: input.nome,
        descricao: input.descricao,
        estados: input.estados,
        estadoInicial: input.estadoInicial,
        ativo: true,
        transicoes: input.transicoes.map((transicao) => ({
          id: this.idGenerator.generateId(),
          ...transicao,
        })),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidWorkflowDefinitionError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.workflowDefinitionRepository.save(definicao);
    return definicao;
  }
}
