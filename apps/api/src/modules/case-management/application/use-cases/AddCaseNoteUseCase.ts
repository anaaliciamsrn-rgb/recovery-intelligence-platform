import { AppError } from "../../../../application/errors/AppError.js";
import { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import { CaseNote } from "../../domain/entities/CaseNote.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";
import type { ICaseNoteRepository } from "../../domain/repositories/ICaseNoteRepository.js";
import type { ICaseRepository } from "../../domain/repositories/ICaseRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface AddCaseNoteInput {
  caseId: string;
  autorId: string | null;
  texto: string;
}

export class AddCaseNoteUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly caseNoteRepository: ICaseNoteRepository,
    private readonly caseHistoryRepository: ICaseHistoryRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: AddCaseNoteInput): Promise<CaseNote> {
    const caso = await this.caseRepository.findById(input.caseId);
    if (!caso) {
      throw new AppError("NOT_FOUND", "Case não encontrado");
    }
    if (input.texto.trim().length === 0) {
      throw new AppError("VALIDATION", "Texto da nota não pode ser vazio");
    }

    const now = this.clock.now();
    const nota = CaseNote.create({
      id: this.idGenerator.generateId(),
      caseId: input.caseId,
      autorId: input.autorId,
      texto: input.texto,
      createdAt: now,
    });
    await this.caseNoteRepository.save(nota);

    await this.caseHistoryRepository.append(
      CaseHistoryEntry.create({
        id: this.idGenerator.generateId(),
        caseId: input.caseId,
        tipo: "NOTA_ADICIONADA",
        descricao: `Nota adicionada: ${input.texto.slice(0, 80)}`,
        autorId: input.autorId,
        timestamp: now,
      }),
    );

    return nota;
  }
}
