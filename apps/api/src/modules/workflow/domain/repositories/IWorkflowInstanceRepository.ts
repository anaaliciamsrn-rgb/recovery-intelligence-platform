import type { WorkflowInstance } from "../entities/WorkflowInstance.js";

export interface IWorkflowInstanceRepository {
  findById(id: string): Promise<WorkflowInstance | null>;
  save(instancia: WorkflowInstance): Promise<void>;
}
