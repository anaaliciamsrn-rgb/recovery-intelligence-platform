import { type PrismaClient, Prisma } from "@prisma/client";
import type { RuleDefinition as RuleDefinitionRecord } from "@prisma/client";
import { RuleDefinition } from "../../domain/entities/RuleDefinition.js";
import type {
  IRuleDefinitionRepository,
  RuleDefinitionFilter,
  RuleDefinitionPage,
  RuleDefinitionPagination,
} from "../../domain/repositories/IRuleDefinitionRepository.js";
import type { RuleCondition } from "../../domain/value-objects/RuleCondition.js";

export class PrismaRuleDefinitionRepository implements IRuleDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<RuleDefinition | null> {
    const record = await this.prisma.ruleDefinition.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(filter?: RuleDefinitionFilter): Promise<RuleDefinition[]> {
    const records = await this.prisma.ruleDefinition.findMany({
      where: {
        ...(filter?.recurso !== undefined ? { recurso: filter.recurso } : {}),
        ...(filter?.ativo !== undefined ? { ativo: filter.ativo } : {}),
      },
      orderBy: [{ prioridade: "desc" }, { createdAt: "desc" }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async findMany(
    filter: RuleDefinitionFilter,
    pagination: RuleDefinitionPagination,
  ): Promise<RuleDefinitionPage> {
    const where = {
      ...(filter.recurso !== undefined ? { recurso: filter.recurso } : {}),
      ...(filter.ativo !== undefined ? { ativo: filter.ativo } : {}),
    };
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.ruleDefinition.findMany({
        where,
        orderBy: [{ prioridade: "desc" }, { createdAt: "desc" }],
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.ruleDefinition.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async save(regra: RuleDefinition): Promise<void> {
    const props = regra.toProps();
    const condicoes = props.condicoes as unknown as Prisma.InputJsonValue;

    await this.prisma.ruleDefinition.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        nome: props.nome,
        descricao: props.descricao,
        recurso: props.recurso,
        condicoes,
        peso: props.peso,
        prioridade: props.prioridade,
        acao: props.acao,
        ativo: props.ativo,
        versaoAtual: props.versaoAtual,
      },
      update: {
        nome: props.nome,
        descricao: props.descricao,
        condicoes,
        peso: props.peso,
        prioridade: props.prioridade,
        acao: props.acao,
        ativo: props.ativo,
        versaoAtual: props.versaoAtual,
      },
    });
  }

  private toDomain(record: RuleDefinitionRecord): RuleDefinition {
    return RuleDefinition.create({
      id: record.id,
      nome: record.nome,
      descricao: record.descricao,
      recurso: record.recurso,
      condicoes: record.condicoes as unknown as RuleCondition[],
      peso: record.peso,
      prioridade: record.prioridade,
      acao: record.acao,
      ativo: record.ativo,
      versaoAtual: record.versaoAtual,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
