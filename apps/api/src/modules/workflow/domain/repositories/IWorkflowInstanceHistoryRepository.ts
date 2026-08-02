import type { WorkflowInstanceHistoryEntry } from "../entities/WorkflowInstanceHistoryEntry.js";

export interface IWorkflowInstanceHistoryRepository {
  append(entry: WorkflowInstanceHistoryEntry): Promise<void>;
  /** Ordenado por `timestamp` ascendente. */
  findByWorkflowInstanceId(workflowInstanceId: string): Promise<WorkflowInstanceHistoryEntry[]>;
}
