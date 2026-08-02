import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { Case } from "../../domain/entities/Case.js";
import type { CaseHistoryEntry } from "../../domain/entities/CaseHistoryEntry.js";
import type { CaseNote } from "../../domain/entities/CaseNote.js";
import type { CasePage } from "../../domain/repositories/ICaseRepository.js";
import type { AddCaseNoteUseCase } from "../../application/use-cases/AddCaseNoteUseCase.js";
import type { CreateCaseUseCase } from "../../application/use-cases/CreateCaseUseCase.js";
import type { GetCaseUseCase } from "../../application/use-cases/GetCaseUseCase.js";
import type { ListCasesUseCase } from "../../application/use-cases/ListCasesUseCase.js";
import type { UpdateCaseDetailsUseCase } from "../../application/use-cases/UpdateCaseDetailsUseCase.js";
import type { UpdateCaseStatusUseCase } from "../../application/use-cases/UpdateCaseStatusUseCase.js";
import {
  addCaseNoteRequestSchema,
  createCaseRequestSchema,
  listCasesQuerySchema,
  updateCaseDetailsRequestSchema,
  updateCaseStatusRequestSchema,
} from "../validators/case.validators.js";

export class CaseController {
  constructor(
    private readonly createCaseUseCase: CreateCaseUseCase,
    private readonly updateCaseStatusUseCase: UpdateCaseStatusUseCase,
    private readonly updateCaseDetailsUseCase: UpdateCaseDetailsUseCase,
    private readonly addCaseNoteUseCase: AddCaseNoteUseCase,
    private readonly getCaseUseCase: GetCaseUseCase,
    private readonly listCasesUseCase: ListCasesUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createCaseRequestSchema, req.body);
    const caso = await this.createCaseUseCase.execute({
      dossieId: body.dossieId,
      ownerId: body.ownerId ?? null,
      priority: body.priority ?? "MEDIA",
      autorId: req.auth?.userId ?? null,
    });
    res.status(201).json(toCaseResponse(caso));
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(updateCaseStatusRequestSchema, req.body);
    await this.updateCaseStatusUseCase.execute({
      caseId: req.params.id ?? "",
      novoStatus: body.status,
      autorId: req.auth?.userId ?? null,
    });
    res.status(204).send();
  };

  updateDetails = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(updateCaseDetailsRequestSchema, req.body);
    await this.updateCaseDetailsUseCase.execute({
      caseId: req.params.id ?? "",
      autorId: req.auth?.userId ?? null,
      ...(body.ownerId !== undefined ? { ownerId: body.ownerId } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.proximaAcao !== undefined ? { proximaAcao: body.proximaAcao } : {}),
      ...(body.dataProximaAcao !== undefined ? { dataProximaAcao: body.dataProximaAcao } : {}),
    });
    res.status(204).send();
  };

  addNote = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(addCaseNoteRequestSchema, req.body);
    const nota = await this.addCaseNoteUseCase.execute({
      caseId: req.params.id ?? "",
      autorId: req.auth?.userId ?? null,
      texto: body.texto,
    });
    res.status(201).json(toNoteResponse(nota));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const detalhe = await this.getCaseUseCase.execute(req.params.id ?? "");
    res.status(200).json({
      ...toCaseResponse(detalhe.caso),
      notas: detalhe.notas.map(toNoteResponse),
      timeline: detalhe.timeline.map(toHistoryResponse),
    });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listCasesQuerySchema, req.query);
    const page = await this.listCasesUseCase.execute({
      filter: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.ownerId ? { ownerId: query.ownerId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.dossieId ? { dossieId: query.dossieId } : {}),
      },
      pagination: { page: query.page ?? 1, pageSize: query.pageSize ?? 20 },
    });
    res.status(200).json(toPageResponse(page));
  };
}

function toCaseResponse(caso: Case) {
  return {
    id: caso.id,
    dossieId: caso.dossieId,
    status: caso.status,
    ownerId: caso.ownerId,
    priority: caso.priority,
    tags: caso.tags,
    proximaAcao: caso.proximaAcao,
    dataProximaAcao: caso.dataProximaAcao ? caso.dataProximaAcao.toISOString() : null,
    createdAt: caso.createdAt.toISOString(),
    updatedAt: caso.updatedAt.toISOString(),
  };
}

function toNoteResponse(nota: CaseNote) {
  return {
    id: nota.id,
    caseId: nota.caseId,
    autorId: nota.autorId,
    texto: nota.texto,
    createdAt: nota.createdAt.toISOString(),
  };
}

function toHistoryResponse(entrada: CaseHistoryEntry) {
  return {
    id: entrada.id,
    caseId: entrada.caseId,
    tipo: entrada.tipo,
    descricao: entrada.descricao,
    autorId: entrada.autorId,
    timestamp: entrada.timestamp.toISOString(),
  };
}

function toPageResponse(page: CasePage) {
  return {
    items: page.items.map(toCaseResponse),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
