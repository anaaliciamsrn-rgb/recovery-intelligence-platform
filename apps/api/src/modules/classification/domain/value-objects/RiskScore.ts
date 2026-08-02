import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidRiskScoreError extends DomainError {}

export type ClasseRisco = "BAIXO_RISCO" | "MEDIO_RISCO" | "ALTO_RISCO";

export const ClasseRisco = {
  BAIXO_RISCO: "BAIXO_RISCO",
  MEDIO_RISCO: "MEDIO_RISCO",
  ALTO_RISCO: "ALTO_RISCO",
} as const satisfies Record<string, ClasseRisco>;

const LIMIAR_ALTO = 0.66;
const LIMIAR_MEDIO = 0.33;

/**
 * Score de risco normalizado em [0, 1] — conceitualmente diferente de
 * `ConfidenceScore` (shared kernel): `RiskScore` responde "o quão arriscado
 * é este sujeito", `ConfidenceScore` responde "o quão seguros estamos dessa
 * conclusão". As duas dimensões nunca são somadas nem confundidas — ver
 * `ClassificacaoResultado` e ADR 0016.
 */
export class RiskScore {
  private constructor(private readonly score: number) {}

  static create(score: number): RiskScore {
    if (Number.isNaN(score) || score < 0 || score > 1) {
      throw new InvalidRiskScoreError(`Risk score fora do intervalo [0,1]: ${score}`);
    }
    return new RiskScore(score);
  }

  toNumber(): number {
    return this.score;
  }

  classe(): ClasseRisco {
    if (this.score >= LIMIAR_ALTO) return ClasseRisco.ALTO_RISCO;
    if (this.score >= LIMIAR_MEDIO) return ClasseRisco.MEDIO_RISCO;
    return ClasseRisco.BAIXO_RISCO;
  }
}
