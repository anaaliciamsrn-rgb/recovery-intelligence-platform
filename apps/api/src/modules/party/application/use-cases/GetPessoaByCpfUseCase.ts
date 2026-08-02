import { AppError } from "../../../../application/errors/AppError.js";
import type { Pessoa } from "../../domain/entities/Pessoa.js";
import { CPF, InvalidCpfError } from "../../domain/value-objects/CPF.js";
import type { IPessoaRepository } from "../../domain/repositories/IPessoaRepository.js";

export interface GetPessoaByCpfOutput {
  id: string;
  cpf: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetPessoaByCpfUseCase {
  constructor(private readonly pessoaRepository: IPessoaRepository) {}

  async execute(rawCpf: string): Promise<GetPessoaByCpfOutput> {
    let cpf: CPF;
    try {
      cpf = CPF.create(rawCpf);
    } catch (error) {
      if (error instanceof InvalidCpfError) {
        throw new AppError("VALIDATION", "CPF inválido");
      }
      throw error;
    }

    const pessoa = await this.pessoaRepository.findByCpf(cpf);
    if (!pessoa) {
      throw new AppError("NOT_FOUND", "Pessoa não encontrada");
    }

    return this.toOutput(pessoa);
  }

  private toOutput(pessoa: Pessoa): GetPessoaByCpfOutput {
    return {
      id: pessoa.id,
      cpf: pessoa.cpf.toString(),
      nome: pessoa.nome,
      createdAt: pessoa.createdAt,
      updatedAt: pessoa.updatedAt,
    };
  }
}
