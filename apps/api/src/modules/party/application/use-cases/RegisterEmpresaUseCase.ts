import { AppError } from "../../../../application/errors/AppError.js";
import { Empresa } from "../../domain/entities/Empresa.js";
import { CNPJ, InvalidCnpjError } from "../../domain/value-objects/CNPJ.js";
import type { IEmpresaRepository } from "../../domain/repositories/IEmpresaRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RegisterEmpresaInput {
  cnpj: string;
  razaoSocial: string;
}

export interface RegisterEmpresaOutput {
  id: string;
  cnpj: string;
  razaoSocial: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RegisterEmpresaUseCase {
  constructor(
    private readonly empresaRepository: IEmpresaRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: RegisterEmpresaInput): Promise<RegisterEmpresaOutput> {
    const cnpj = this.parseCnpj(input.cnpj);

    const existing = await this.empresaRepository.findByCnpj(cnpj);
    if (existing) {
      throw new AppError("CONFLICT", "Já existe uma empresa cadastrada com este CNPJ");
    }

    const now = this.clock.now();
    const empresa = Empresa.create({
      id: this.idGenerator.generateId(),
      cnpj,
      razaoSocial: input.razaoSocial,
      createdAt: now,
      updatedAt: now,
    });

    await this.empresaRepository.save(empresa);

    return this.toOutput(empresa);
  }

  private parseCnpj(raw: string): CNPJ {
    try {
      return CNPJ.create(raw);
    } catch (error) {
      if (error instanceof InvalidCnpjError) {
        throw new AppError("VALIDATION", "CNPJ inválido");
      }
      throw error;
    }
  }

  private toOutput(empresa: Empresa): RegisterEmpresaOutput {
    return {
      id: empresa.id,
      cnpj: empresa.cnpj.toString(),
      razaoSocial: empresa.razaoSocial,
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
    };
  }
}
