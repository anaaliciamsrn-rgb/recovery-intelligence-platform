import type {
  PrismaClient,
  ParticipacaoSocietaria as PrismaParticipacaoRecord,
} from "@prisma/client";
import { ParticipacaoSocietaria } from "../../domain/entities/ParticipacaoSocietaria.js";
import type { PapelSocietario } from "../../domain/value-objects/PapelSocietario.js";
import type { IParticipacaoSocietariaRepository } from "../../domain/repositories/IParticipacaoSocietariaRepository.js";

export class PrismaParticipacaoSocietariaRepository implements IParticipacaoSocietariaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ParticipacaoSocietaria | null> {
    const record = await this.prisma.participacaoSocietaria.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByPessoaId(pessoaId: string): Promise<ParticipacaoSocietaria[]> {
    const records = await this.prisma.participacaoSocietaria.findMany({ where: { pessoaId } });
    return records.map((record) => this.toDomain(record));
  }

  async findByEmpresaId(empresaId: string): Promise<ParticipacaoSocietaria[]> {
    const records = await this.prisma.participacaoSocietaria.findMany({ where: { empresaId } });
    return records.map((record) => this.toDomain(record));
  }

  async save(participacao: ParticipacaoSocietaria): Promise<void> {
    const props = participacao.toProps();
    const percentual =
      props.percentualParticipacao !== null ? props.percentualParticipacao.toString() : null;

    await this.prisma.participacaoSocietaria.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        pessoaId: props.pessoaId,
        empresaId: props.empresaId,
        papel: props.papel,
        percentualParticipacao: percentual,
        dataEntrada: props.dataEntrada,
        dataSaida: props.dataSaida,
      },
      update: {
        papel: props.papel,
        percentualParticipacao: percentual,
        dataEntrada: props.dataEntrada,
        dataSaida: props.dataSaida,
      },
    });
  }

  private toDomain(record: PrismaParticipacaoRecord): ParticipacaoSocietaria {
    return ParticipacaoSocietaria.create({
      id: record.id,
      pessoaId: record.pessoaId,
      empresaId: record.empresaId,
      papel: record.papel as PapelSocietario,
      percentualParticipacao: record.percentualParticipacao
        ? Number(record.percentualParticipacao)
        : null,
      dataEntrada: record.dataEntrada,
      dataSaida: record.dataSaida,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
