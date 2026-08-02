import type {
  PrismaClient,
  WorkflowInstance as PrismaWorkflowInstanceRecord,
} from "@prisma/client";
import { WorkflowInstance } from "../../domain/entities/WorkflowInstance.js";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/IWorkflowInstanceRepository.js";

export class PrismaWorkflowInstanceRepository implements IWorkflowInstanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WorkflowInstance | null> {
    const record = await this.prisma.workflowInstance.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async save(instancia: WorkflowInstance): Promise<void> {
    const props = instancia.toProps();
    await this.prisma.workflowInstance.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        workflowDefinitionId: props.workflowDefinitionId,
        referenciaId: props.referenciaId,
        estadoAtual: props.estadoAtual,
      },
      update: { estadoAtual: props.estadoAtual },
    });
  }

  private toDomain(record: PrismaWorkflowInstanceRecord): WorkflowInstance {
    return WorkflowInstance.create({
      id: record.id,
      workflowDefinitionId: record.workflowDefinitionId,
      referenciaId: record.referenciaId,
      estadoAtual: record.estadoAtual,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
