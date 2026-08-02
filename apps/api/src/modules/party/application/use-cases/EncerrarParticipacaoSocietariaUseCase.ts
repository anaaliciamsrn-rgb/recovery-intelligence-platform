import { AppError } from "../../../../application/errors/AppError.js";
import { InvalidParticipacaoSocietariaError } from "../../domain/entities/ParticipacaoSocietaria.js";
import type { IParticipacaoSocietariaRepository } from "../../domain/repositories/IParticipacaoSocietariaRepository.js";
import type { IClock } from "../ports/IClock.js";

export interface EncerrarParticipacaoSocietariaInput {
  id: string;
  dataSaida: Date | null;
}

export class EncerrarParticipacaoSocietariaUseCase {
  constructor(
    private readonly participacaoRepository: IParticipacaoSocietariaRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: EncerrarParticipacaoSocietariaInput): Promise<void> {
    const participacao = await this.participacaoRepository.findById(input.id);
    if (!participacao) {
      throw new AppError("NOT_FOUND", "Participação societária não encontrada");
    }

    const now = this.clock.now();

    try {
      participacao.encerrar(input.dataSaida ?? now, now);
    } catch (error) {
      if (error instanceof InvalidParticipacaoSocietariaError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.participacaoRepository.save(participacao);
  }
}
