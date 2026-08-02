import { AppError } from "../../../../application/errors/AppError.js";
import { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";
import type { ICaseRepository } from "../../domain/repositories/ICaseRepository.js";
import type { CasePriority } from "../../domain/value-objects/CasePriority.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface UpdateCaseDetailsInput {
  caseId: string;
  autorId: string | null;
  ownerId?: string | null;
  priority?: CasePriority;
  tags?: string[];
  proximaAcao?: string | null;
  dataProximaAcao?: Date | null;
}

/** Atualiza owner/prioridade/tags/próxima ação — cada campo alterado gera sua própria entrada de timeline. */
export class UpdateCaseDetailsUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly caseHistoryRepository: ICaseHistoryRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: UpdateCaseDetailsInput): Promise<void> {
    const caso = await this.caseRepository.findById(input.caseId);
    if (!caso) {
      throw new AppError("NOT_FOUND", "Case não encontrado");
    }

    const now = this.clock.now();
    const eventos: {
      tipo: "OWNER_ALTERADO" | "PRIORIDADE_ALTERADA" | "TAGS_ALTERADAS" | "PROXIMA_ACAO_DEFINIDA";
      descricao: string;
    }[] = [];

    if (input.ownerId !== undefined && input.ownerId !== caso.ownerId) {
      caso.atualizarOwner(input.ownerId, now);
      eventos.push({
        tipo: "OWNER_ALTERADO",
        descricao: `Responsável alterado para ${input.ownerId ?? "nenhum"}`,
      });
    }
    if (input.priority !== undefined && input.priority !== caso.priority) {
      caso.atualizarPrioridade(input.priority, now);
      eventos.push({
        tipo: "PRIORIDADE_ALTERADA",
        descricao: `Prioridade alterada para ${input.priority}`,
      });
    }
    if (input.tags !== undefined) {
      caso.atualizarTags(input.tags, now);
      eventos.push({
        tipo: "TAGS_ALTERADAS",
        descricao: `Tags atualizadas: ${input.tags.join(", ") || "nenhuma"}`,
      });
    }
    if (input.proximaAcao !== undefined || input.dataProximaAcao !== undefined) {
      caso.definirProximaAcao(
        input.proximaAcao ?? caso.proximaAcao,
        input.dataProximaAcao ?? caso.dataProximaAcao,
        now,
      );
      eventos.push({
        tipo: "PROXIMA_ACAO_DEFINIDA",
        descricao: `Próxima ação definida: ${caso.proximaAcao ?? "nenhuma"}`,
      });
    }

    if (eventos.length === 0) return;

    await this.caseRepository.save(caso);
    for (const evento of eventos) {
      await this.caseHistoryRepository.append(
        CaseHistoryEntry.create({
          id: this.idGenerator.generateId(),
          caseId: caso.id,
          tipo: evento.tipo,
          descricao: evento.descricao,
          autorId: input.autorId,
          timestamp: now,
        }),
      );
    }
  }
}
