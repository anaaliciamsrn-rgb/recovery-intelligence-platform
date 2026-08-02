import { AppError } from "../../../../application/errors/AppError.js";
import { WorkflowInstance } from "../../domain/entities/WorkflowInstance.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/IWorkflowInstanceRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface StartWorkflowInstanceInput {
  workflowDefinitionId: string;
  referenciaId: string;
}

export class StartWorkflowInstanceUseCase {
  constructor(
    private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: StartWorkflowInstanceInput): Promise<WorkflowInstance> {
    const definicao = await this.workflowDefinitionRepository.findById(input.workflowDefinitionId);
    if (!definicao) {
      throw new AppError("NOT_FOUND", "Fluxo não encontrado");
    }
    if (!definicao.ativo) {
      throw new AppError("VALIDATION", "Fluxo está inativo");
    }

    const instancia = WorkflowInstance.iniciar({
      id: this.idGenerator.generateId(),
      workflowDefinitionId: input.workflowDefinitionId,
      referenciaId: input.referenciaId,
      estadoInicial: definicao.estadoInicial,
      now: this.clock.now(),
    });

    await this.workflowInstanceRepository.save(instancia);
    return instancia;
  }
}
