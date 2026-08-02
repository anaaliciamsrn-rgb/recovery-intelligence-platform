import { JobExecutionEntry } from "../../domain/entities/JobExecutionEntry.js";
import type { ScheduledJob } from "../../domain/entities/ScheduledJob.js";
import { JobRetryPolicy } from "../../domain/services/JobRetryPolicy.js";
import type { IJobExecutionRepository } from "../../domain/repositories/IJobExecutionRepository.js";
import type { IScheduledJobRepository } from "../../domain/repositories/IScheduledJobRepository.js";
import { JobExecutionStatus } from "../../domain/value-objects/JobExecutionStatus.js";
import { ScheduledJobStatus } from "../../domain/value-objects/ScheduledJobStatus.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { IJobHandlerRegistry } from "../ports/IJobHandlerRegistry.js";

const DEFAULT_LIMIT = 50;

export interface RunDueJobsSummary {
  executados: number;
  concluidos: number;
  reagendados: number;
  mortos: number;
}

/**
 * O motor do scheduler: processa todos os jobs PENDENTE cuja `agendadoPara`
 * já passou. Não é disparado por um timer interno do processo — precisa de
 * um chamador externo (ex.: cron de infraestrutura batendo no endpoint HTTP
 * correspondente), decisão registrada explicitamente na ADR 0032.
 */
export class RunDueJobsUseCase {
  constructor(
    private readonly scheduledJobRepository: IScheduledJobRepository,
    private readonly jobExecutionRepository: IJobExecutionRepository,
    private readonly jobHandlerRegistry: IJobHandlerRegistry,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(limit: number = DEFAULT_LIMIT): Promise<RunDueJobsSummary> {
    const now = this.clock.now();
    const jobsDevidos = await this.scheduledJobRepository.findDue(now, limit);

    const summary: RunDueJobsSummary = { executados: 0, concluidos: 0, reagendados: 0, mortos: 0 };

    for (const job of jobsDevidos) {
      await this.executarUm(job, summary);
    }

    return summary;
  }

  private async executarUm(job: ScheduledJob, summary: RunDueJobsSummary): Promise<void> {
    const inicioExecucao = this.clock.now();
    const tentativaAtual = job.tentativas + 1;

    job.iniciarExecucao(inicioExecucao);
    await this.scheduledJobRepository.save(job);
    summary.executados += 1;

    try {
      const handler = this.jobHandlerRegistry.resolve(job.tipo);
      if (!handler) {
        throw new Error(`Nenhum handler registrado para o tipo "${job.tipo}"`);
      }
      await handler.handle(job.payload);

      const fim = this.clock.now();
      job.concluir(fim);
      await this.scheduledJobRepository.save(job);
      await this.jobExecutionRepository.append(
        JobExecutionEntry.create({
          id: this.idGenerator.generateId(),
          scheduledJobId: job.id,
          tentativa: tentativaAtual,
          status: JobExecutionStatus.SUCESSO,
          erro: null,
          iniciadoEm: inicioExecucao,
          finalizadoEm: fim,
          duracaoMs: fim.getTime() - inicioExecucao.getTime(),
        }),
      );
      summary.concluidos += 1;
    } catch (error) {
      const fim = this.clock.now();
      const mensagemErro = error instanceof Error ? error.message : "Erro desconhecido";
      const proximaTentativa = JobRetryPolicy.calcularProximaTentativa(
        job.tentativas,
        job.maxTentativas,
        fim,
      );

      job.falhar(mensagemErro, proximaTentativa, fim);
      await this.scheduledJobRepository.save(job);
      await this.jobExecutionRepository.append(
        JobExecutionEntry.create({
          id: this.idGenerator.generateId(),
          scheduledJobId: job.id,
          tentativa: tentativaAtual,
          status: JobExecutionStatus.FALHA,
          erro: mensagemErro,
          iniciadoEm: inicioExecucao,
          finalizadoEm: fim,
          duracaoMs: fim.getTime() - inicioExecucao.getTime(),
        }),
      );

      if (job.status === ScheduledJobStatus.MORTO) {
        summary.mortos += 1;
      } else {
        summary.reagendados += 1;
      }
    }
  }
}
