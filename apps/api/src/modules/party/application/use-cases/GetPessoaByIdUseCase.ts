import { AppError } from "../../../../application/errors/AppError.js";
import type { Pessoa } from "../../domain/entities/Pessoa.js";
import type { IPessoaRepository } from "../../domain/repositories/IPessoaRepository.js";

export interface GetPessoaByIdOutput {
  id: string;
  cpf: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resolve um `pessoaId` opaco (referenciado por `ParticipacaoSocietaria`,
 * `Dossie`, `Case`, etc.) para um nome exibível — sem isto, o frontend não
 * tem como mostrar quem é o outro lado de um vínculo societário sem
 * conhecer o CPF de antemão.
 */
export class GetPessoaByIdUseCase {
  constructor(private readonly pessoaRepository: IPessoaRepository) {}

  async execute(id: string): Promise<GetPessoaByIdOutput> {
    const pessoa = await this.pessoaRepository.findById(id);
    if (!pessoa) {
      throw new AppError("NOT_FOUND", "Pessoa não encontrada");
    }
    return this.toOutput(pessoa);
  }

  private toOutput(pessoa: Pessoa): GetPessoaByIdOutput {
    return {
      id: pessoa.id,
      cpf: pessoa.cpf.toString(),
      nome: pessoa.nome,
      createdAt: pessoa.createdAt,
      updatedAt: pessoa.updatedAt,
    };
  }
}
