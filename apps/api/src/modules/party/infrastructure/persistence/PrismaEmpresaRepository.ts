import type { PrismaClient, Empresa as PrismaEmpresaRecord } from "@prisma/client";
import { Empresa } from "../../domain/entities/Empresa.js";
import { CNPJ } from "../../domain/value-objects/CNPJ.js";
import type { IEmpresaRepository } from "../../domain/repositories/IEmpresaRepository.js";

export class PrismaEmpresaRepository implements IEmpresaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Empresa | null> {
    const record = await this.prisma.empresa.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCnpj(cnpj: CNPJ): Promise<Empresa | null> {
    const record = await this.prisma.empresa.findUnique({ where: { cnpj: cnpj.toString() } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Empresa[]> {
    const records = await this.prisma.empresa.findMany();
    return records.map((record) => this.toDomain(record));
  }

  async save(empresa: Empresa): Promise<void> {
    const props = empresa.toProps();

    await this.prisma.empresa.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        cnpj: props.cnpj.toString(),
        razaoSocial: props.razaoSocial,
      },
      update: {
        razaoSocial: props.razaoSocial,
      },
    });
  }

  private toDomain(record: PrismaEmpresaRecord): Empresa {
    return Empresa.create({
      id: record.id,
      cnpj: CNPJ.create(record.cnpj),
      razaoSocial: record.razaoSocial,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
