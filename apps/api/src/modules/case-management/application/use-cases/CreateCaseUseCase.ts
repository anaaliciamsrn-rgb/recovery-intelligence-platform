import { AppError } from "../../../../application/errors/AppError.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import { Case } from "../../domain/entities/Case.js";
import { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";
import type { ICaseRepository } from "../../domain/repositories/ICaseRepository.js";
import type { CasePriority } from "../../domain/value-objects/CasePriority.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateCaseInput {
  dossieId: string;
  ownerId: string | null;
  priority: CasePriority;
  autorId: string | null;
}

/** Cria um novo Case para um Dossiê já existente — valida a existência do Dossiê antes de criar, mesmo padrão de `CreateDossieUseCase` (ADR 0015). */
export class CreateCaseUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly caseHistoryRepository: ICaseHistoryRepository,
    private readonly dossieRepository: IDossieRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateCaseInput): Promise<Case> {
    const dossie = await this.dossieRepository.findById(input.dossieId);
    if (!dossie) {
      throw new AppError("VALIDATION", "Dossiê não encontrado para o dossieId informado");
    }

    const now = this.clock.now();
    const caso = Case.abrir({
      id: this.idGenerator.generateId(),
      dossieId: input.dossieId,
      ownerId: input.ownerId,
      priority: input.priority,
      now,
    });
    await this.caseRepository.save(caso);

    await this.caseHistoryRepository.append(
      CaseHistoryEntry.create({
        id: this.idGenerator.generateId(),
        caseId: caso.id,
        tipo: "CASO_CRIADO",
        descricao: `Case criado para o dossiê ${input.dossieId}`,
        autorId: input.autorId,
        timestamp: now,
      }),
    );

    return caso;
  }
}
