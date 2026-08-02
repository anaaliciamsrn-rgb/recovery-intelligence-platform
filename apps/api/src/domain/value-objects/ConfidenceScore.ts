import { DomainError } from "../errors/DomainError.js";

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
 * Score normalizado em [0, 1], do shared kernel — usado por `Evidence`
 * (qualquer consulta futura) e por outros modelos que precisem de confiança
 * genérica. Cópia deliberada da versão de `modules/identity-resolution`
 * (mesmo motivo de `IIdGenerator`/`IClock` serem duplicados por módulo nos
 * ADRs 0010/0011): shared kernel não pode depender de um módulo de negócio
 * específico. Ver ADR 0014.
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
