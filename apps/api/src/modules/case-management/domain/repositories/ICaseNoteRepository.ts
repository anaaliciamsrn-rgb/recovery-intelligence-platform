import type { CaseNote } from "../entities/CaseNote.js";

export interface ICaseNoteRepository {
  save(nota: CaseNote): Promise<void>;
  /** Ordenado por `createdAt` ascendente. */
  findByCaseId(caseId: string): Promise<CaseNote[]>;
}
