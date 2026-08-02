import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { RuleDefinition } from "../../domain/entities/RuleDefinition.js";
import type { RuleVersionEntry } from "../../domain/entities/RuleVersionEntry.js";
import type { RuleEvaluationResult, RuleMatch } from "../../domain/services/RuleEvaluator.js";
import type { CreateRuleDefinitionUseCase } from "../../application/use-cases/CreateRuleDefinitionUseCase.js";
import type { EvaluateRulesUseCase } from "../../application/use-cases/EvaluateRulesUseCase.js";
import type { GetRuleDefinitionUseCase } from "../../application/use-cases/GetRuleDefinitionUseCase.js";
import type { ListRuleDefinitionsUseCase } from "../../application/use-cases/ListRuleDefinitionsUseCase.js";
import type { UpdateRuleDefinitionUseCase } from "../../application/use-cases/UpdateRuleDefinitionUseCase.js";
import {
  createRuleDefinitionRequestSchema,
  evaluateRulesRequestSchema,
  listRuleDefinitionsQuerySchema,
  updateRuleDefinitionRequestSchema,
} from "../validators/rule-builder.validators.js";

export class RuleBuilderController {
  constructor(
    private readonly createRuleDefinitionUseCase: CreateRuleDefinitionUseCase,
    private readonly updateRuleDefinitionUseCase: UpdateRuleDefinitionUseCase,
    private readonly getRuleDefinitionUseCase: GetRuleDefinitionUseCase,
    private readonly listRuleDefinitionsUseCase: ListRuleDefinitionsUseCase,
    private readonly evaluateRulesUseCase: EvaluateRulesUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createRuleDefinitionRequestSchema, req.body);
    const regra = await this.createRuleDefinitionUseCase.execute({
      nome: body.nome,
      descricao: body.descricao ?? null,
      recurso: body.recurso,
      condicoes: body.condicoes,
      peso: body.peso,
      prioridade: body.prioridade,
      acao: body.acao,
      ativo: body.ativo ?? true,
    });
    res.status(201).json(toRuleResponse(regra));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(updateRuleDefinitionRequestSchema, req.body);
    const regra = await this.updateRuleDefinitionUseCase.execute({
      ruleDefinitionId: req.params.id ?? "",
      nome: body.nome,
      descricao: body.descricao ?? null,
      condicoes: body.condicoes,
      peso: body.peso,
      prioridade: body.prioridade,
      acao: body.acao,
      ativo: body.ativo,
    });
    res.status(200).json(toRuleResponse(regra));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const detalhe = await this.getRuleDefinitionUseCase.execute(req.params.id ?? "");
    res
      .status(200)
      .json({ ...toRuleResponse(detalhe.regra), versoes: detalhe.versoes.map(toVersionResponse) });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listRuleDefinitionsQuerySchema, req.query);
    const pagina = await this.listRuleDefinitionsUseCase.execute(
      {
        ...(query.recurso !== undefined ? { recurso: query.recurso } : {}),
        ...(query.ativo !== undefined ? { ativo: query.ativo === "true" } : {}),
      },
      { page: query.page ?? 1, pageSize: query.pageSize ?? 50 },
    );
    res
      .status(200)
      .json({
        items: pagina.items.map(toRuleResponse),
        total: pagina.total,
        page: pagina.page,
        pageSize: pagina.pageSize,
      });
  };

  evaluate = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(evaluateRulesRequestSchema, req.body);
    const resultado = await this.evaluateRulesUseCase.execute({
      recurso: body.recurso,
      contexto: body.contexto,
    });
    res.status(200).json(toEvaluationResponse(resultado));
  };
}

function toRuleResponse(regra: RuleDefinition) {
  return {
    id: regra.id,
    nome: regra.nome,
    descricao: regra.descricao,
    recurso: regra.recurso,
    condicoes: regra.condicoes,
    peso: regra.peso,
    prioridade: regra.prioridade,
    acao: regra.acao,
    ativo: regra.ativo,
    versaoAtual: regra.versaoAtual,
    createdAt: regra.createdAt.toISOString(),
    updatedAt: regra.updatedAt.toISOString(),
  };
}

function toVersionResponse(versao: RuleVersionEntry) {
  return {
    id: versao.id,
    versao: versao.versao,
    nome: versao.nome,
    descricao: versao.descricao,
    condicoes: versao.condicoes,
    peso: versao.peso,
    prioridade: versao.prioridade,
    acao: versao.acao,
    ativo: versao.ativo,
    criadoEm: versao.criadoEm.toISOString(),
  };
}

function toMatchResponse(match: RuleMatch) {
  return { regra: toRuleResponse(match.regra), condicoesSatisfeitas: match.condicoesSatisfeitas };
}

function toEvaluationResponse(resultado: RuleEvaluationResult) {
  return {
    regrasCasadas: resultado.regrasCasadas.map(toMatchResponse),
    pontuacaoTotal: resultado.pontuacaoTotal,
  };
}
