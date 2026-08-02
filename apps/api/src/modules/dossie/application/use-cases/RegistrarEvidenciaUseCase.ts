import { AppError } from "../../../../application/errors/AppError.js";
import {
  ConfidenceScore,
  InvalidConfidenceScoreError,
} from "../../../../domain/value-objects/ConfidenceScore.js";
import { Evidence, type EvidenceStatus } from "../../../../domain/value-objects/Evidence.js";
import type { DossieFonte } from "../../domain/value-objects/DossieFonte.js";
import type { IDossieRepository } from "../../domain/repositories/IDossieRepository.js";
import type { IClock } from "../ports/IClock.js";

export interface RegistrarEvidenciaInput {
  dossieId: string;
  fonte: DossieFonte;
  status: EvidenceStatus;
  valor: unknown;
  confidenceScore: number | null;
  motivoErro: string | null;
}

/**
 * Preenche/substitui a evidência de uma única fonte do dossiê. Não faz
 * nenhuma chamada externa — é o ponto de extensão que uma futura integração
 * real (worker, job, endpoint dedicado por fonte) vai chamar depois de
 * consultar PGFN/DataJud/Receita/Portal da Transparência/CENPROT de fato.
 * Ver ADR 0015.
 */
export class RegistrarEvidenciaUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: RegistrarEvidenciaInput): Promise<void> {
    const dossie = await this.dossieRepository.findById(input.dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const now = this.clock.now();
    const evidence = this.buildEvidence(input, now);

    dossie.atualizarEvidencia(input.fonte, evidence, now);
    await this.dossieRepository.save(dossie);
  }

  private buildEvidence(input: RegistrarEvidenciaInput, now: Date): Evidence<unknown> {
    switch (input.status) {
      case "ENCONTRADO":
        return Evidence.encontrada({
          valor: input.valor,
          fonte: input.fonte,
          dataConsulta: now,
          confidenceScore: this.parseConfidenceScore(input.confidenceScore),
        });
      case "NAO_ENCONTRADO":
        return Evidence.naoEncontrada({
          fonte: input.fonte,
          dataConsulta: now,
          confidenceScore: this.parseConfidenceScore(input.confidenceScore),
        });
      case "NAO_CONSULTADO":
        return Evidence.naoConsultada({ fonte: input.fonte });
      case "ERRO_CONSULTA":
        if (!input.motivoErro) {
          throw new AppError("VALIDATION", "motivoErro é obrigatório para status ERRO_CONSULTA");
        }
        return Evidence.comErro({
          fonte: input.fonte,
          dataConsulta: now,
          motivoErro: input.motivoErro,
        });
    }
  }

  private parseConfidenceScore(value: number | null): ConfidenceScore {
    if (value === null) {
      throw new AppError("VALIDATION", "confidenceScore é obrigatório para este status");
    }
    try {
      return ConfidenceScore.create(value);
    } catch (error) {
      if (error instanceof InvalidConfidenceScoreError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }
  }
}
