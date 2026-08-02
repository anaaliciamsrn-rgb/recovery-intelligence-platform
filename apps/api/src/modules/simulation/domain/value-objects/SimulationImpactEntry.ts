import type { SimulationChange } from "./SimulationChange.js";

/** Por que uma mudança específica gerou (ou não) impacto — produzido por `SimulationImpactAnalyzer`, sempre determinístico, nunca inferido por IA. Ver ADR 0023. */
export interface SimulationImpactEntry {
  change: SimulationChange;
  descricao: string;
  afetouRisco: boolean;
  afetouClassificacao: boolean;
  afetouConfianca: boolean;
  afetouRecomendacao: boolean;
}
