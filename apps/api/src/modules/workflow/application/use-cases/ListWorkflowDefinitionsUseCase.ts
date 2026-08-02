import type { WorkflowDefinition } from "../../domain/entities/WorkflowDefinition.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";

export class ListWorkflowDefinitionsUseCase {
  constructor(private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository) {}

  async execute(): Promise<WorkflowDefinition[]> {
    return this.workflowDefinitionRepository.findAll();
  }
}
