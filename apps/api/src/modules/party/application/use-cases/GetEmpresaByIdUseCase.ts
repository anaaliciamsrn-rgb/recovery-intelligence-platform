import { AppError } from "../../../../application/errors/AppError.js";
import type { Empresa } from "../../domain/entities/Empresa.js";
import type { IEmpresaRepository } from "../../domain/repositories/IEmpresaRepository.js";

export interface GetEmpresaByIdOutput {
  id: string;
  cnpj: string;
  razaoSocial: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Resolve um `empresaId` opaco para razão social exibível — mesma motivação de `GetPessoaByIdUseCase`. */
export class GetEmpresaByIdUseCase {
  constructor(private readonly empresaRepository: IEmpresaRepository) {}

  async execute(id: string): Promise<GetEmpresaByIdOutput> {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) {
      throw new AppError("NOT_FOUND", "Empresa não encontrada");
    }
    return this.toOutput(empresa);
  }

  private toOutput(empresa: Empresa): GetEmpresaByIdOutput {
    return {
      id: empresa.id,
      cnpj: empresa.cnpj.toString(),
      razaoSocial: empresa.razaoSocial,
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
    };
  }
}
