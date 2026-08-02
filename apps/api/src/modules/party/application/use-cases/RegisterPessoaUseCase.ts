import { AppError } from "../../../../application/errors/AppError.js";
import { Pessoa } from "../../domain/entities/Pessoa.js";
import { CPF, InvalidCpfError } from "../../domain/value-objects/CPF.js";
import type { IPessoaRepository } from "../../domain/repositories/IPessoaRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RegisterPessoaInput {
  cpf: string;
  nome: string;
}

export interface RegisterPessoaOutput {
  id: string;
  cpf: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RegisterPessoaUseCase {
  constructor(
    private readonly pessoaRepository: IPessoaRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: RegisterPessoaInput): Promise<RegisterPessoaOutput> {
    const cpf = this.parseCpf(input.cpf);

    const existing = await this.pessoaRepository.findByCpf(cpf);
    if (existing) {
      throw new AppError("CONFLICT", "Já existe uma pessoa cadastrada com este CPF");
    }

    const now = this.clock.now();
    const pessoa = Pessoa.create({
      id: this.idGenerator.generateId(),
      cpf,
      nome: input.nome,
      createdAt: now,
      updatedAt: now,
    });

    await this.pessoaRepository.save(pessoa);

    return this.toOutput(pessoa);
  }

  private parseCpf(raw: string): CPF {
    try {
      return CPF.create(raw);
    } catch (error) {
      if (error instanceof InvalidCpfError) {
        throw new AppError("VALIDATION", "CPF inválido");
      }
      throw error;
    }
  }

  private toOutput(pessoa: Pessoa): RegisterPessoaOutput {
    return {
      id: pessoa.id,
      cpf: pessoa.cpf.toString(),
      nome: pessoa.nome,
      createdAt: pessoa.createdAt,
      updatedAt: pessoa.updatedAt,
    };
  }
}
