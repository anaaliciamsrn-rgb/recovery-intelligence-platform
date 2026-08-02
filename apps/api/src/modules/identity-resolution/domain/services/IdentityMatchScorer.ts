import { ConfidenceScore, NivelConfianca } from "../value-objects/ConfidenceScore.js";
import { MatchDecision } from "../value-objects/MatchDecision.js";
import type { MatchSignal } from "../value-objects/MatchSignal.js";

export interface IdentityMatchScore {
  confidenceScore: ConfidenceScore;
  decision: MatchDecision;
}

const NIVEL_PARA_DECISAO: Record<NivelConfianca, MatchDecision> = {
  ALTA: MatchDecision.MATCH,
  MEDIA: MatchDecision.POSSIBLE_MATCH,
  BAIXA: MatchDecision.NO_MATCH,
};

/**
 * Serviço de domínio puro — sem I/O, sem estado. Agrega os sinais
 * (`MatchSignal[]`) produzidos por uma `IIdentityResolutionStrategy` num
 * `ConfidenceScore` e numa `MatchDecision`. Deliberadamente simples (média
 * ponderada) — a Sprint 4 pede a fundação, não um algoritmo sofisticado de
 * resolução de identidade (ver ADR 0013).
 */
export class IdentityMatchScorer {
  static score(signals: MatchSignal[]): IdentityMatchScore {
    if (signals.length === 0) {
      const confidenceScore = ConfidenceScore.create(0);
      return { confidenceScore, decision: NIVEL_PARA_DECISAO[confidenceScore.nivel()] };
    }

    const pesoTotal = signals.reduce((total, signal) => total + signal.peso, 0);
    const pesoFavoravel = signals
      .filter((signal) => signal.favoravel)
      .reduce((total, signal) => total + signal.peso, 0);

    const confidenceScore = ConfidenceScore.create(pesoTotal > 0 ? pesoFavoravel / pesoTotal : 0);

    return { confidenceScore, decision: NIVEL_PARA_DECISAO[confidenceScore.nivel()] };
  }
}
