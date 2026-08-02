import { AppError } from "../../../../application/errors/AppError.js";
import { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import { InvalidCaseTransitionError } from "../../domain/entities/Case.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";
import type { ICaseRepository } from "../../domain/repositories/ICaseRepository.js";
import type { CaseStatus } from "../../domain/value-objects/CaseStatus.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface UpdateCaseStatusInput {
  caseId: string;
  novoStatus: CaseStatus;
  autorId: string | null;
}

export class UpdateCaseStatusUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly caseHistoryRepository: ICaseHistoryRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: UpdateCaseStatusInput): Promise<void> {
    const caso = await this.caseRepository.findById(input.caseId);
    if (!caso) {
      throw new AppError("NOT_FOUND", "Case não encontrado");
    }

    const statusAnterior = caso.status;
    try {
      caso.transicionarStatus(input.novoStatus, this.clock.now());
    } catch (error) {
      if (error instanceof InvalidCaseTransitionError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.caseRepository.save(caso);
    await this.caseHistoryRepository.append(
      CaseHistoryEntry.create({
        id: this.idGenerator.generateId(),
        caseId: caso.id,
        tipo: "STATUS_ALTERADO",
        descricao: `Status alterado de ${statusAnterior} para ${input.novoStatus}`,
        autorId: input.autorId,
        timestamp: this.clock.now(),
      }),
    );
  }
}
