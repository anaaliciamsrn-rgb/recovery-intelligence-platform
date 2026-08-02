import { AppError } from "../../../../application/errors/AppError.js";
import {
  InvalidParticipacaoSocietariaError,
  ParticipacaoSocietaria,
} from "../../domain/entities/ParticipacaoSocietaria.js";
import type { PapelSocietario } from "../../domain/value-objects/PapelSocietario.js";
import type { IEmpresaRepository } from "../../domain/repositories/IEmpresaRepository.js";
import type { IParticipacaoSocietariaRepository } from "../../domain/repositories/IParticipacaoSocietariaRepository.js";
import type { IPessoaRepository } from "../../domain/repositories/IPessoaRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RegisterParticipacaoSocietariaInput {
  pessoaId: string;
  empresaId: string;
  papel: PapelSocietario;
  percentualParticipacao: number | null;
  dataEntrada: Date | null;
}

export interface RegisterParticipacaoSocietariaOutput {
  id: string;
  pessoaId: string;
  empresaId: string;
  papel: PapelSocietario;
  percentualParticipacao: number | null;
  dataEntrada: Date | null;
  dataSaida: Date | null;
}

/**
 * Valida que `Pessoa` e `Empresa` referenciadas existem antes de criar o
 * vínculo — mas nunca carrega os objetos além disso, nem os expõe no output
 * (só os ids). Ver ADR 0012.
 */
export class RegisterParticipacaoSocietariaUseCase {
  constructor(
    private readonly participacaoRepository: IParticipacaoSocietariaRepository,
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(
    input: RegisterParticipacaoSocietariaInput,
  ): Promise<RegisterParticipacaoSocietariaOutput> {
    const pessoa = await this.pessoaRepository.findById(input.pessoaId);
    if (!pessoa) {
      throw new AppError("VALIDATION", "Pessoa não encontrada para o pessoaId informado");
    }

    const empresa = await this.empresaRepository.findById(input.empresaId);
    if (!empresa) {
      throw new AppError("VALIDATION", "Empresa não encontrada para o empresaId informado");
    }

    const now = this.clock.now();

    let participacao: ParticipacaoSocietaria;
    try {
      participacao = ParticipacaoSocietaria.create({
        id: this.idGenerator.generateId(),
        pessoaId: input.pessoaId,
        empresaId: input.empresaId,
        papel: input.papel,
        percentualParticipacao: input.percentualParticipacao,
        dataEntrada: input.dataEntrada,
        dataSaida: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidParticipacaoSocietariaError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.participacaoRepository.save(participacao);

    return this.toOutput(participacao);
  }

  private toOutput(participacao: ParticipacaoSocietaria): RegisterParticipacaoSocietariaOutput {
    return {
      id: participacao.id,
      pessoaId: participacao.pessoaId,
      empresaId: participacao.empresaId,
      papel: participacao.papel,
      percentualParticipacao: participacao.percentualParticipacao,
      dataEntrada: participacao.dataEntrada,
      dataSaida: participacao.dataSaida,
    };
  }
}
