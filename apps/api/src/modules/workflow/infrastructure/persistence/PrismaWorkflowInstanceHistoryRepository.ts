import type {
  PrismaClient,
  WorkflowInstanceHistoryEntry as PrismaWorkflowInstanceHistoryRecord,
} from "@prisma/client";
import { WorkflowInstanceHistoryEntry } from "../../domain/entities/WorkflowInstanceHistoryEntry.js";
import type { IWorkflowInstanceHistoryRepository } from "../../domain/repositories/IWorkflowInstanceHistoryRepository.js";

export class PrismaWorkflowInstanceHistoryRepository implements IWorkflowInstanceHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entry: WorkflowInstanceHistoryEntry): Promise<void> {
    const props = entry.toProps();
    await this.prisma.workflowInstanceHistoryEntry.create({
      data: {
        id: props.id,
        workflowInstanceId: props.workflowInstanceId,
        de: props.de,
        para: props.para,
        gatilho: props.gatilho,
        timestamp: props.timestamp,
      },
    });
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: string,
  ): Promise<WorkflowInstanceHistoryEntry[]> {
    const records = await this.prisma.workflowInstanceHistoryEntry.findMany({
      where: { workflowInstanceId },
      orderBy: { timestamp: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaWorkflowInstanceHistoryRecord): WorkflowInstanceHistoryEntry {
    return WorkflowInstanceHistoryEntry.create({
      id: record.id,
      workflowInstanceId: record.workflowInstanceId,
      de: record.de,
      para: record.para,
      gatilho: record.gatilho,
      timestamp: record.timestamp,
    });
  }
}
