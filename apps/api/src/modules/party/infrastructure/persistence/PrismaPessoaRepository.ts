import type { PrismaClient, Pessoa as PrismaPessoaRecord } from "@prisma/client";
import { Pessoa } from "../../domain/entities/Pessoa.js";
import { CPF } from "../../domain/value-objects/CPF.js";
import type { IPessoaRepository } from "../../domain/repositories/IPessoaRepository.js";

export class PrismaPessoaRepository implements IPessoaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Pessoa | null> {
    const record = await this.prisma.pessoa.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCpf(cpf: CPF): Promise<Pessoa | null> {
    const record = await this.prisma.pessoa.findUnique({ where: { cpf: cpf.toString() } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Pessoa[]> {
    const records = await this.prisma.pessoa.findMany();
    return records.map((record) => this.toDomain(record));
  }

  async save(pessoa: Pessoa): Promise<void> {
    const props = pessoa.toProps();

    await this.prisma.pessoa.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        cpf: props.cpf.toString(),
        nome: props.nome,
      },
      update: {
        nome: props.nome,
      },
    });
  }

  private toDomain(record: PrismaPessoaRecord): Pessoa {
    return Pessoa.create({
      id: record.id,
      cpf: CPF.create(record.cpf),
      nome: record.nome,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
