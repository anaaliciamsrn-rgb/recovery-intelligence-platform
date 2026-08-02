import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { WorkflowDefinition } from "../../domain/entities/WorkflowDefinition.js";
import type { WorkflowInstance } from "../../domain/entities/WorkflowInstance.js";
import type { WorkflowInstanceHistoryEntry } from "../../domain/entities/WorkflowInstanceHistoryEntry.js";
import type { CreateWorkflowDefinitionUseCase } from "../../application/use-cases/CreateWorkflowDefinitionUseCase.js";
import type { GetWorkflowDefinitionUseCase } from "../../application/use-cases/GetWorkflowDefinitionUseCase.js";
import type { GetWorkflowInstanceUseCase } from "../../application/use-cases/GetWorkflowInstanceUseCase.js";
import type { ListWorkflowDefinitionsUseCase } from "../../application/use-cases/ListWorkflowDefinitionsUseCase.js";
import type { StartWorkflowInstanceUseCase } from "../../application/use-cases/StartWorkflowInstanceUseCase.js";
import type { TriggerWorkflowTransitionUseCase } from "../../application/use-cases/TriggerWorkflowTransitionUseCase.js";
import {
  createWorkflowDefinitionRequestSchema,
  startWorkflowInstanceRequestSchema,
  triggerWorkflowTransitionRequestSchema,
} from "../validators/workflow.validators.js";

export class WorkflowController {
  constructor(
    private readonly createWorkflowDefinitionUseCase: CreateWorkflowDefinitionUseCase,
    private readonly listWorkflowDefinitionsUseCase: ListWorkflowDefinitionsUseCase,
    private readonly getWorkflowDefinitionUseCase: GetWorkflowDefinitionUseCase,
    private readonly startWorkflowInstanceUseCase: StartWorkflowInstanceUseCase,
    private readonly triggerWorkflowTransitionUseCase: TriggerWorkflowTransitionUseCase,
    private readonly getWorkflowInstanceUseCase: GetWorkflowInstanceUseCase,
  ) {}

  createDefinition = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createWorkflowDefinitionRequestSchema, req.body);
    const definicao = await this.createWorkflowDefinitionUseCase.execute({
      nome: body.nome,
      descricao: body.descricao ?? null,
      estados: body.estados,
      estadoInicial: body.estadoInicial,
      transicoes: body.transicoes.map((transicao) => ({
        ...transicao,
        condicao: transicao.condicao ?? null,
        acao: transicao.acao ?? null,
      })),
    });
    res.status(201).json(toDefinitionResponse(definicao));
  };

  listDefinitions = async (_req: Request, res: Response): Promise<void> => {
    const definicoes = await this.listWorkflowDefinitionsUseCase.execute();
    res.status(200).json({ items: definicoes.map(toDefinitionResponse) });
  };

  getDefinition = async (req: Request, res: Response): Promise<void> => {
    const definicao = await this.getWorkflowDefinitionUseCase.execute(req.params.id ?? "");
    res.status(200).json(toDefinitionResponse(definicao));
  };

  startInstance = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(startWorkflowInstanceRequestSchema, req.body);
    const instancia = await this.startWorkflowInstanceUseCase.execute({
      workflowDefinitionId: req.params.id ?? "",
      referenciaId: body.referenciaId,
    });
    res.status(201).json(toInstanceResponse(instancia));
  };

  triggerTransition = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(triggerWorkflowTransitionRequestSchema, req.body);
    const resultado = await this.triggerWorkflowTransitionUseCase.execute({
      workflowInstanceId: req.params.id ?? "",
      gatilho: body.gatilho,
      ...(body.contexto !== undefined ? { contexto: body.contexto } : {}),
    });
    res.status(200).json(resultado);
  };

  getInstance = async (req: Request, res: Response): Promise<void> => {
    const detalhe = await this.getWorkflowInstanceUseCase.execute(req.params.id ?? "");
    res
      .status(200)
      .json({
        ...toInstanceResponse(detalhe.instancia),
        historico: detalhe.historico.map(toHistoryResponse),
      });
  };
}

function toDefinitionResponse(definicao: WorkflowDefinition) {
  return {
    id: definicao.id,
    nome: definicao.nome,
    descricao: definicao.descricao,
    estados: definicao.estados,
    estadoInicial: definicao.estadoInicial,
    ativo: definicao.ativo,
    transicoes: definicao.transicoes,
    createdAt: definicao.createdAt.toISOString(),
    updatedAt: definicao.updatedAt.toISOString(),
  };
}

function toInstanceResponse(instancia: WorkflowInstance) {
  return {
    id: instancia.id,
    workflowDefinitionId: instancia.workflowDefinitionId,
    referenciaId: instancia.referenciaId,
    estadoAtual: instancia.estadoAtual,
    createdAt: instancia.createdAt.toISOString(),
    updatedAt: instancia.updatedAt.toISOString(),
  };
}

function toHistoryResponse(entrada: WorkflowInstanceHistoryEntry) {
  return {
    id: entrada.id,
    de: entrada.de,
    para: entrada.para,
    gatilho: entrada.gatilho,
    timestamp: entrada.timestamp.toISOString(),
  };
}
