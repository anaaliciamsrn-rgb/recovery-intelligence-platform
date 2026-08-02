import { type PrismaClient, Prisma } from "@prisma/client";
import type { RuleVersionEntry as RuleVersionEntryRecord } from "@prisma/client";
import { RuleVersionEntry } from "../../domain/entities/RuleVersionEntry.js";
import type { IRuleVersionRepository } from "../../domain/repositories/IRuleVersionRepository.js";
import type { RuleCondition } from "../../domain/value-objects/RuleCondition.js";

export class PrismaRuleVersionRepository implements IRuleVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entrada: RuleVersionEntry): Promise<void> {
    const props = entrada.toProps();
    await this.prisma.ruleVersionEntry.create({
      data: {
        id: props.id,
        ruleDefinitionId: props.ruleDefinitionId,
        versao: props.versao,
        nome: props.nome,
        descricao: props.descricao,
        recurso: props.recurso,
        condicoes: props.condicoes as unknown as Prisma.InputJsonValue,
        peso: props.peso,
        prioridade: props.prioridade,
        acao: props.acao,
        ativo: props.ativo,
      },
    });
  }

  async findByRuleDefinitionId(ruleDefinitionId: string): Promise<RuleVersionEntry[]> {
    const records = await this.prisma.ruleVersionEntry.findMany({
      where: { ruleDefinitionId },
      orderBy: { versao: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: RuleVersionEntryRecord): RuleVersionEntry {
    return RuleVersionEntry.create({
      id: record.id,
      ruleDefinitionId: record.ruleDefinitionId,
      versao: record.versao,
      nome: record.nome,
      descricao: record.descricao,
      recurso: record.recurso,
      condicoes: record.condicoes as unknown as RuleCondition[],
      peso: record.peso,
      prioridade: record.prioridade,
      acao: record.acao,
      ativo: record.ativo,
      criadoEm: record.criadoEm,
    });
  }
}
