import { AppError } from "../../../../application/errors/AppError.js";
import { InvalidScheduledJobError, ScheduledJob } from "../../domain/entities/ScheduledJob.js";
import type { IScheduledJobRepository } from "../../domain/repositories/IScheduledJobRepository.js";
import { ScheduledJobStatus } from "../../domain/value-objects/ScheduledJobStatus.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateScheduledJobInput {
  nome: string;
  tipo: string;
  payload: Record<string, unknown>;
  agendadoPara: Date;
  maxTentativas: number;
}

/** Agenda um job novo — nasce PENDENTE, tentativas=0. Ver ADR 0032. */
export class CreateScheduledJobUseCase {
  constructor(
    private readonly scheduledJobRepository: IScheduledJobRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateScheduledJobInput): Promise<ScheduledJob> {
    const now = this.clock.now();

    let job: ScheduledJob;
    try {
      job = ScheduledJob.agendar({
        id: this.idGenerator.generateId(),
        nome: input.nome,
        tipo: input.tipo,
        payload: input.payload,
        status: ScheduledJobStatus.PENDENTE,
        agendadoPara: input.agendadoPara,
        tentativas: 0,
        maxTentativas: input.maxTentativas,
        ultimoErro: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidScheduledJobError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.scheduledJobRepository.save(job);
    return job;
  }
}
