import { AppError } from "../../../../application/errors/AppError.js";
import type { WorkflowInstance } from "../../domain/entities/WorkflowInstance.js";
import type { WorkflowInstanceHistoryEntry } from "../../domain/entities/WorkflowInstanceHistoryEntry.js";
import type { IWorkflowInstanceHistoryRepository } from "../../domain/repositories/IWorkflowInstanceHistoryRepository.js";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/IWorkflowInstanceRepository.js";

export interface WorkflowInstanceDetail {
  instancia: WorkflowInstance;
  historico: WorkflowInstanceHistoryEntry[];
}

export class GetWorkflowInstanceUseCase {
  constructor(
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly workflowInstanceHistoryRepository: IWorkflowInstanceHistoryRepository,
  ) {}

  async execute(id: string): Promise<WorkflowInstanceDetail> {
    const instancia = await this.workflowInstanceRepository.findById(id);
    if (!instancia) {
      throw new AppError("NOT_FOUND", "Instância de fluxo não encontrada");
    }

    const historico = await this.workflowInstanceHistoryRepository.findByWorkflowInstanceId(id);
    return { instancia, historico };
  }
}
