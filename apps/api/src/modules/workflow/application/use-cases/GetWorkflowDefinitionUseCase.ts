import { AppError } from "../../../../application/errors/AppError.js";
import type { WorkflowDefinition } from "../../domain/entities/WorkflowDefinition.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";

export class GetWorkflowDefinitionUseCase {
  constructor(private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository) {}

  async execute(id: string): Promise<WorkflowDefinition> {
    const definicao = await this.workflowDefinitionRepository.findById(id);
    if (!definicao) {
      throw new AppError("NOT_FOUND", "Fluxo não encontrado");
    }
    return definicao;
  }
}
