import { AppError } from "../../../../application/errors/AppError.js";
import { WorkflowInstanceHistoryEntry } from "../../domain/entities/WorkflowInstanceHistoryEntry.js";
import { WorkflowEngine } from "../../domain/services/WorkflowEngine.js";
import type { IWorkflowDefinitionRepository } from "../../domain/repositories/IWorkflowDefinitionRepository.js";
import type { IWorkflowInstanceHistoryRepository } from "../../domain/repositories/IWorkflowInstanceHistoryRepository.js";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/IWorkflowInstanceRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface TriggerWorkflowTransitionInput {
  workflowInstanceId: string;
  gatilho: string;
  contexto?: Record<string, unknown>;
}

export interface TriggerWorkflowTransitionOutput {
  estadoAnterior: string;
  estadoNovo: string;
  acao: string | null;
}

/**
 * Aplica a transição encontrada pelo `WorkflowEngine` — se nenhuma
 * transição casar o estado atual + gatilho (+ condição), lança `VALIDATION`
 * em vez de silenciosamente não fazer nada. Ver ADR 0027.
 */
export class TriggerWorkflowTransitionUseCase {
  constructor(
    private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly workflowInstanceHistoryRepository: IWorkflowInstanceHistoryRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: TriggerWorkflowTransitionInput): Promise<TriggerWorkflowTransitionOutput> {
    const instancia = await this.workflowInstanceRepository.findById(input.workflowInstanceId);
    if (!instancia) {
      throw new AppError("NOT_FOUND", "Instância de fluxo não encontrada");
    }

    const definicao = await this.workflowDefinitionRepository.findById(
      instancia.workflowDefinitionId,
    );
    if (!definicao) {
      throw new AppError("NOT_FOUND", "Fluxo não encontrado");
    }

    const transicao = WorkflowEngine.encontrarTransicao(
      definicao,
      instancia.estadoAtual,
      input.gatilho,
      input.contexto ?? {},
    );
    if (!transicao) {
      throw new AppError(
        "VALIDATION",
        `Nenhuma transição aplicável para o estado "${instancia.estadoAtual}" com o gatilho "${input.gatilho}"`,
      );
    }

    const estadoAnterior = instancia.estadoAtual;
    const now = this.clock.now();
    instancia.aplicarTransicao(transicao.para, now);
    await this.workflowInstanceRepository.save(instancia);

    await this.workflowInstanceHistoryRepository.append(
      WorkflowInstanceHistoryEntry.create({
        id: this.idGenerator.generateId(),
        workflowInstanceId: instancia.id,
        de: estadoAnterior,
        para: transicao.para,
        gatilho: input.gatilho,
        timestamp: now,
      }),
    );

    return { estadoAnterior, estadoNovo: transicao.para, acao: transicao.acao };
  }
}
