import { AppError } from "../../../../application/errors/AppError.js";
import type { Empresa } from "../../domain/entities/Empresa.js";
import { CNPJ, InvalidCnpjError } from "../../domain/value-objects/CNPJ.js";
import type { IEmpresaRepository } from "../../domain/repositories/IEmpresaRepository.js";

export interface GetEmpresaByCnpjOutput {
  id: string;
  cnpj: string;
  razaoSocial: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetEmpresaByCnpjUseCase {
  constructor(private readonly empresaRepository: IEmpresaRepository) {}

  async execute(rawCnpj: string): Promise<GetEmpresaByCnpjOutput> {
    let cnpj: CNPJ;
    try {
      cnpj = CNPJ.create(rawCnpj);
    } catch (error) {
      if (error instanceof InvalidCnpjError) {
        throw new AppError("VALIDATION", "CNPJ inválido");
      }
      throw error;
    }

    const empresa = await this.empresaRepository.findByCnpj(cnpj);
    if (!empresa) {
      throw new AppError("NOT_FOUND", "Empresa não encontrada");
    }

    return this.toOutput(empresa);
  }

  private toOutput(empresa: Empresa): GetEmpresaByCnpjOutput {
    return {
      id: empresa.id,
      cnpj: empresa.cnpj.toString(),
      razaoSocial: empresa.razaoSocial,
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
    };
  }
}
