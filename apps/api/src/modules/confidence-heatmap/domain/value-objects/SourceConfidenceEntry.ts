import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";

export interface SourceConfidenceEntry {
  fonte: DossieFonte;
  status: "ENCONTRADO" | "NAO_ENCONTRADO" | "NAO_CONSULTADO" | "ERRO_CONSULTA";
  /** Confiança individual daquela fonte (não a agregada) — `null` quando a fonte não tem esse campo (`NAO_CONSULTADO`/`ERRO_CONSULTA`). */
  confidenceScore: number | null;
  /** Participação percentual (0–100) dessa fonte na soma das confidenceScore de todas as fontes respondidas. */
  contribuicaoPercentual: number;
}

export interface HistoricalConfidenceEntry {
  versao: number;
  timestamp: string;
  confidenceScore: number;
}
