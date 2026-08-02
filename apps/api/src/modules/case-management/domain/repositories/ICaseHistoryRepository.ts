import type { CaseHistoryEntry } from "../entities/CaseHistoryEntry.js";

export interface ICaseHistoryRepository {
  append(entry: CaseHistoryEntry): Promise<void>;
  /** Ordenado por `timestamp` ascendente. */
  findByCaseId(caseId: string): Promise<CaseHistoryEntry[]>;
}
