import { AppError } from "../../../../application/errors/AppError.js";
import type { Dossie } from "../../domain/entities/Dossie.js";
import type { IDossieRepository } from "../../domain/repositories/IDossieRepository.js";

export class GetDossieUseCase {
  constructor(private readonly dossieRepository: IDossieRepository) {}

  async execute(id: string): Promise<Dossie> {
    const dossie = await this.dossieRepository.findById(id);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }
    return dossie;
  }
}
