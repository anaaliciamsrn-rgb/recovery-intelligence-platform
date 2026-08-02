import { AppError } from "../../../../application/errors/AppError.js";
import type { Case } from "../../domain/entities/Case.js";
import type { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import type { CaseNote } from "../../domain/entities/CaseNote.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";
import type { ICaseNoteRepository } from "../../domain/repositories/ICaseNoteRepository.js";
import type { ICaseRepository } from "../../domain/repositories/ICaseRepository.js";

export interface CaseDetail {
  caso: Case;
  notas: CaseNote[];
  timeline: CaseHistoryEntry[];
}

/** `GET /cases/:id` — junta o Case com suas notas e timeline, cada uma vinda do seu próprio repositório (ADR 0026). */
export class GetCaseUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly caseNoteRepository: ICaseNoteRepository,
    private readonly caseHistoryRepository: ICaseHistoryRepository,
  ) {}

  async execute(caseId: string): Promise<CaseDetail> {
    const caso = await this.caseRepository.findById(caseId);
    if (!caso) {
      throw new AppError("NOT_FOUND", "Case não encontrado");
    }

    const [notas, timeline] = await Promise.all([
      this.caseNoteRepository.findByCaseId(caseId),
      this.caseHistoryRepository.findByCaseId(caseId),
    ]);

    return { caso, notas, timeline };
  }
}
