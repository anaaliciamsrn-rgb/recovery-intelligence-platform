import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { JobExecutionEntry } from "../../domain/entities/JobExecutionEntry.js";
import type { ScheduledJob } from "../../domain/entities/ScheduledJob.js";
import type { CreateScheduledJobUseCase } from "../../application/use-cases/CreateScheduledJobUseCase.js";
import type { GetScheduledJobUseCase } from "../../application/use-cases/GetScheduledJobUseCase.js";
import type { ListScheduledJobsUseCase } from "../../application/use-cases/ListScheduledJobsUseCase.js";
import type { RunDueJobsUseCase } from "../../application/use-cases/RunDueJobsUseCase.js";
import {
  createScheduledJobRequestSchema,
  listScheduledJobsQuerySchema,
  runDueJobsRequestSchema,
} from "../validators/scheduler.validators.js";

export class SchedulerController {
  constructor(
    private readonly createScheduledJobUseCase: CreateScheduledJobUseCase,
    private readonly getScheduledJobUseCase: GetScheduledJobUseCase,
    private readonly listScheduledJobsUseCase: ListScheduledJobsUseCase,
    private readonly runDueJobsUseCase: RunDueJobsUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createScheduledJobRequestSchema, req.body);
    const job = await this.createScheduledJobUseCase.execute({
      nome: body.nome,
      tipo: body.tipo,
      payload: body.payload ?? {},
      agendadoPara: body.agendadoPara,
      maxTentativas: body.maxTentativas ?? 3,
    });
    res.status(201).json(toJobResponse(job));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const detalhe = await this.getScheduledJobUseCase.execute(req.params.id ?? "");
    res
      .status(200)
      .json({
        ...toJobResponse(detalhe.job),
        execucoes: detalhe.execucoes.map(toExecutionResponse),
      });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listScheduledJobsQuerySchema, req.query);
    const pagina = await this.listScheduledJobsUseCase.execute(
      query.status !== undefined ? { status: query.status } : {},
      { page: query.page ?? 1, pageSize: query.pageSize ?? 50 },
    );
    res
      .status(200)
      .json({
        items: pagina.items.map(toJobResponse),
        total: pagina.total,
        page: pagina.page,
        pageSize: pagina.pageSize,
      });
  };

  runDue = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(runDueJobsRequestSchema, req.body ?? {});
    const resumo = await this.runDueJobsUseCase.execute(body.limit);
    res.status(200).json(resumo);
  };
}

function toJobResponse(job: ScheduledJob) {
  return {
    id: job.id,
    nome: job.nome,
    tipo: job.tipo,
    payload: job.payload,
    status: job.status,
    agendadoPara: job.agendadoPara.toISOString(),
    tentativas: job.tentativas,
    maxTentativas: job.maxTentativas,
    ultimoErro: job.ultimoErro,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function toExecutionResponse(execucao: JobExecutionEntry) {
  return {
    id: execucao.id,
    tentativa: execucao.tentativa,
    status: execucao.status,
    erro: execucao.erro,
    iniciadoEm: execucao.iniciadoEm.toISOString(),
    finalizadoEm: execucao.finalizadoEm.toISOString(),
    duracaoMs: execucao.duracaoMs,
  };
}
