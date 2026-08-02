import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { AuditEvent } from "../../domain/entities/AuditEvent.js";
import type {
  AuditEventFilter,
  AuditEventPage,
  AuditEventPagination,
} from "../../domain/repositories/IAuditEventRepository.js";
import type { GetAuditEventByIdUseCase } from "../../application/use-cases/GetAuditEventByIdUseCase.js";
import type { ListAuditEventsByEntityUseCase } from "../../application/use-cases/ListAuditEventsByEntityUseCase.js";
import type { ListAuditEventsByRequestIdUseCase } from "../../application/use-cases/ListAuditEventsByRequestIdUseCase.js";
import type { ListAuditEventsByUserUseCase } from "../../application/use-cases/ListAuditEventsByUserUseCase.js";
import type { ListAuditEventsUseCase } from "../../application/use-cases/ListAuditEventsUseCase.js";
import {
  listAuditEventsQuerySchema,
  paginationQuerySchema,
  type PaginationQuery,
} from "../validators/audit.validators.js";

function toPagination(query: PaginationQuery): AuditEventPagination {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    sortBy: query.sortBy ?? "timestamp",
    sortOrder: query.sortOrder ?? "desc",
  };
}

export class AuditController {
  constructor(
    private readonly listAuditEventsUseCase: ListAuditEventsUseCase,
    private readonly getAuditEventByIdUseCase: GetAuditEventByIdUseCase,
    private readonly listAuditEventsByEntityUseCase: ListAuditEventsByEntityUseCase,
    private readonly listAuditEventsByUserUseCase: ListAuditEventsByUserUseCase,
    private readonly listAuditEventsByRequestIdUseCase: ListAuditEventsByRequestIdUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listAuditEventsQuerySchema, req.query);

    const filter: AuditEventFilter = {
      ...(query.desde ? { desde: query.desde } : {}),
      ...(query.ate ? { ate: query.ate } : {}),
      ...(query.usuarioId ? { usuarioId: query.usuarioId } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.entidade ? { entidade: query.entidade } : {}),
      ...(query.sucesso !== undefined
        ? { outcome: query.sucesso === "true" ? "SUCESSO" : "FALHA" }
        : {}),
    };

    const page = await this.listAuditEventsUseCase.execute({
      filter,
      pagination: toPagination(query),
    });

    res.status(200).json(toPageResponse(page));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const event = await this.getAuditEventByIdUseCase.execute(req.params.id ?? "");
    res.status(200).json(toEventResponse(event));
  };

  listByEntity = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(paginationQuerySchema, req.query);

    const page = await this.listAuditEventsByEntityUseCase.execute({
      entidade: req.params.entity ?? "",
      entidadeId: req.params.id ?? "",
      pagination: toPagination(query),
    });

    res.status(200).json(toPageResponse(page));
  };

  listByUser = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(paginationQuerySchema, req.query);

    const page = await this.listAuditEventsByUserUseCase.execute({
      usuarioId: req.params.userId ?? "",
      pagination: toPagination(query),
    });

    res.status(200).json(toPageResponse(page));
  };

  listByRequestId = async (req: Request, res: Response): Promise<void> => {
    const events = await this.listAuditEventsByRequestIdUseCase.execute(req.params.requestId ?? "");
    res.status(200).json({ items: events.map(toEventResponse) });
  };
}

function toEventResponse(event: AuditEvent) {
  return {
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    usuarioId: event.usuarioId,
    entidade: event.entidade,
    entidadeId: event.entidadeId,
    tipo: event.tipo,
    payload: event.payload,
    requestId: event.requestId,
    ip: event.ip,
    userAgent: event.userAgent,
    duracaoMs: event.duracaoMs,
    outcome: event.outcome,
    mensagem: event.mensagem,
  };
}

function toPageResponse(page: AuditEventPage) {
  return {
    items: page.items.map(toEventResponse),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
