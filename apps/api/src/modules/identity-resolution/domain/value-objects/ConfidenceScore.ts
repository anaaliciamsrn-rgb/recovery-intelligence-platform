import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidConfidenceScoreError extends DomainError {}

export type NivelConfianca = "ALTA" | "MEDIA" | "BAIXA";

export const NivelConfianca = {
  ALTA: "ALTA",
  MEDIA: "MEDIA",
  BAIXA: "BAIXA",
} as const satisfies Record<string, NivelConfianca>;

const LIMIAR_ALTA = 0.8;
const LIMIAR_MEDIA = 0.5;

/**
 * Score normalizado em [0, 1] — nunca um número solto espalhado pelo código.
 * O limiar de classificação (ALTA/MEDIA/BAIXA) é o único lugar que decide o
 * que "confiança alta" significa; motores de classificação/recomendação
 * futuros (Sprint 7/8) consomem `nivel()`, não o número bruto, sempre que a
 * decisão for binária/categórica.
 */
export class ConfidenceScore {
  private constructor(private readonly score: number) {}

  static create(score: number): ConfidenceScore {
    if (Number.isNaN(score) || score < 0 || score > 1) {
      throw new InvalidConfidenceScoreError(`Confidence score fora do intervalo [0,1]: ${score}`);
    }
    return new ConfidenceScore(score);
  }

  toNumber(): number {
    return this.score;
  }

  nivel(): NivelConfianca {
    if (this.score >= LIMIAR_ALTA) return NivelConfianca.ALTA;
    if (this.score >= LIMIAR_MEDIA) return NivelConfianca.MEDIA;
    return NivelConfianca.BAIXA;
  }
}
