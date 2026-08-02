import { type PrismaClient, Prisma } from "@prisma/client";
import { WorkflowDefinition } from "../../domain/entities/WorkflowDefinition.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";
import type { WorkflowCondition } from "../../domain/value-objects/WorkflowCondition.js";

type WorkflowDefinitionRecordWithTransicoes = Prisma.WorkflowDefinitionGetPayload<{
  include: { transicoes: true };
}>;

export class PrismaWorkflowDefinitionRepository implements IWorkflowDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WorkflowDefinition | null> {
    const record = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: { transicoes: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<WorkflowDefinition[]> {
    const records = await this.prisma.workflowDefinition.findMany({
      include: { transicoes: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  /** Substitui inteiramente as transições da definição a cada save — simples e correto, já que hoje só `create` chama isto (nenhum use case edita transições após a criação). */
  async save(definicao: WorkflowDefinition): Promise<void> {
    const props = definicao.toProps();

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.upsert({
        where: { id: props.id },
        create: {
          id: props.id,
          nome: props.nome,
          descricao: props.descricao,
          estados: props.estados,
          estadoInicial: props.estadoInicial,
          ativo: props.ativo,
        },
        update: {
          nome: props.nome,
          descricao: props.descricao,
          estados: props.estados,
          estadoInicial: props.estadoInicial,
          ativo: props.ativo,
        },
      });

      await tx.workflowTransitionRecord.deleteMany({ where: { workflowDefinitionId: props.id } });
      if (props.transicoes.length > 0) {
        await tx.workflowTransitionRecord.createMany({
          data: props.transicoes.map((transicao) => ({
            id: transicao.id,
            workflowDefinitionId: props.id,
            de: transicao.de,
            para: transicao.para,
            gatilho: transicao.gatilho,
            condicao:
              transicao.condicao === null
                ? Prisma.JsonNull
                : (transicao.condicao as unknown as Prisma.InputJsonValue),
            acao: transicao.acao,
          })),
        });
      }
    });
  }

  private toDomain(record: WorkflowDefinitionRecordWithTransicoes): WorkflowDefinition {
    return WorkflowDefinition.create({
      id: record.id,
      nome: record.nome,
      descricao: record.descricao,
      estados: record.estados,
      estadoInicial: record.estadoInicial,
      ativo: record.ativo,
      transicoes: record.transicoes.map((transicao) => ({
        id: transicao.id,
        de: transicao.de,
        para: transicao.para,
        gatilho: transicao.gatilho,
        condicao: transicao.condicao as WorkflowCondition | null,
        acao: transicao.acao,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
