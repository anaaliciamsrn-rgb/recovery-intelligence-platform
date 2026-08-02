import type { SimulationChange } from "./SimulationChange.js";
import type { SimulationComparison } from "./SimulationComparison.js";
import type { SimulationImpactEntry } from "./SimulationImpactEntry.js";
import type {
  RecomendacaoSnapshotItem,
  SimulationStateSnapshot,
} from "./SimulationStateSnapshot.js";

export interface SimulationDeltas {
  riskScoreDelta: number;
  confidenceScoreDelta: number;
  classificacaoMudou: boolean;
  recomendacaoMudou: boolean;
  promptMudou: boolean;
}

/**
 * Resposta completa de `POST /api/v1/simulation` — antes, depois, deltas,
 * comparações objeto-a-objeto, mudanças detectadas em linguagem simples,
 * análise de impacto por mudança, e um resumo em linguagem natural. Nunca
 * persistido — nasce e morre dentro de `RunSimulationUseCase.execute()`.
 * Ver ADR 0023.
 */
export interface SimulationResult {
  dossieId: string;
  changes: SimulationChange[];
  antes: SimulationStateSnapshot;
  depois: SimulationStateSnapshot;
  deltas: SimulationDeltas;
  comparacao: {
    score: SimulationComparison<number>;
    classificacao: SimulationComparison<string>;
    confianca: SimulationComparison<number>;
    recomendacoes: SimulationComparison<RecomendacaoSnapshotItem[]>;
    prompt: SimulationComparison<string>;
  };
  mudancasDetectadas: string[];
  impactos: SimulationImpactEntry[];
  resumo: string;
}
