import type { WorkflowDefinition } from "../entities/WorkflowDefinition.js";

export interface IWorkflowDefinitionRepository {
  findById(id: string): Promise<WorkflowDefinition | null>;
  save(definicao: WorkflowDefinition): Promise<void>;
  findAll(): Promise<WorkflowDefinition[]>;
}
