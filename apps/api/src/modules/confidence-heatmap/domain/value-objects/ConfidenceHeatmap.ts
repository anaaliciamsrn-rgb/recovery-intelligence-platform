import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { HistoricalConfidenceEntry, SourceConfidenceEntry } from "./SourceConfidenceEntry.js";

export interface ConfidenceHeatmap {
  dossieId: string;
  fontes: SourceConfidenceEntry[];
  fontesAusentes: DossieFonte[];
  fontesConflitantes: DossieFonte[];
  confiancaAgregada: number;
  riskScore: number;
  classificacao: string;
  confiancaHistorica: HistoricalConfidenceEntry[];
}
