import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { FeatureFlag } from "../../domain/entities/FeatureFlag.js";
import type { FeatureFlagOverride } from "../../domain/entities/FeatureFlagOverride.js";
import type { FeatureFlagResolution } from "../../domain/services/FeatureFlagResolver.js";
import type { FeatureFlagScopeType } from "../../domain/value-objects/FeatureFlagScope.js";
import type { CreateFeatureFlagUseCase } from "../../application/use-cases/CreateFeatureFlagUseCase.js";
import type { EvaluateFeatureFlagUseCase } from "../../application/use-cases/EvaluateFeatureFlagUseCase.js";
import type { GetFeatureFlagUseCase } from "../../application/use-cases/GetFeatureFlagUseCase.js";
import type { ListFeatureFlagsUseCase } from "../../application/use-cases/ListFeatureFlagsUseCase.js";
import type { RemoveFeatureFlagOverrideUseCase } from "../../application/use-cases/RemoveFeatureFlagOverrideUseCase.js";
import type { SetFeatureFlagOverrideUseCase } from "../../application/use-cases/SetFeatureFlagOverrideUseCase.js";
import type { UpdateFeatureFlagUseCase } from "../../application/use-cases/UpdateFeatureFlagUseCase.js";
import {
  createFeatureFlagRequestSchema,
  evaluateFeatureFlagQuerySchema,
  listFeatureFlagsQuerySchema,
  setFeatureFlagOverrideRequestSchema,
  updateFeatureFlagRequestSchema,
} from "../validators/feature-flags.validators.js";

export class FeatureFlagController {
  constructor(
    private readonly createFeatureFlagUseCase: CreateFeatureFlagUseCase,
    private readonly updateFeatureFlagUseCase: UpdateFeatureFlagUseCase,
    private readonly getFeatureFlagUseCase: GetFeatureFlagUseCase,
    private readonly listFeatureFlagsUseCase: ListFeatureFlagsUseCase,
    private readonly setFeatureFlagOverrideUseCase: SetFeatureFlagOverrideUseCase,
    private readonly removeFeatureFlagOverrideUseCase: RemoveFeatureFlagOverrideUseCase,
    private readonly evaluateFeatureFlagUseCase: EvaluateFeatureFlagUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createFeatureFlagRequestSchema, req.body);
    const flag = await this.createFeatureFlagUseCase.execute({
      chave: body.chave,
      descricao: body.descricao ?? null,
      ativoPadrao: body.ativoPadrao ?? false,
    });
    res.status(201).json(toFlagResponse(flag));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(updateFeatureFlagRequestSchema, req.body);
    const flag = await this.updateFeatureFlagUseCase.execute({
      chave: req.params.chave ?? "",
      descricao: body.descricao ?? null,
      ativoPadrao: body.ativoPadrao,
    });
    res.status(200).json(toFlagResponse(flag));
  };

  getByChave = async (req: Request, res: Response): Promise<void> => {
    const detalhe = await this.getFeatureFlagUseCase.execute(req.params.chave ?? "");
    res
      .status(200)
      .json({
        ...toFlagResponse(detalhe.flag),
        overrides: detalhe.overrides.map(toOverrideResponse),
      });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listFeatureFlagsQuerySchema, req.query);
    const pagina = await this.listFeatureFlagsUseCase.execute({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
    res
      .status(200)
      .json({
        items: pagina.items.map(toFlagResponse),
        total: pagina.total,
        page: pagina.page,
        pageSize: pagina.pageSize,
      });
  };

  setOverride = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(setFeatureFlagOverrideRequestSchema, req.body);
    const override = await this.setFeatureFlagOverrideUseCase.execute({
      chave: req.params.chave ?? "",
      escopoTipo: body.escopoTipo,
      escopoValor: body.escopoValor,
      ativo: body.ativo,
    });
    res.status(200).json(toOverrideResponse(override));
  };

  removeOverride = async (req: Request, res: Response): Promise<void> => {
    await this.removeFeatureFlagOverrideUseCase.execute({
      chave: req.params.chave ?? "",
      escopoTipo: (req.params.escopoTipo ?? "") as FeatureFlagScopeType,
      escopoValor: req.params.escopoValor ?? "",
    });
    res.status(204).send();
  };

  evaluate = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(evaluateFeatureFlagQuerySchema, req.query);
    const resolucao = await this.evaluateFeatureFlagUseCase.execute({
      chave: req.params.chave ?? "",
      contexto: {
        tenantId: query.tenantId ?? null,
        ambiente: query.ambiente ?? null,
        userId: query.userId ?? null,
      },
    });
    res.status(200).json(toResolutionResponse(resolucao));
  };
}

function toFlagResponse(flag: FeatureFlag) {
  return {
    id: flag.id,
    chave: flag.chave,
    descricao: flag.descricao,
    ativoPadrao: flag.ativoPadrao,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}

function toOverrideResponse(override: FeatureFlagOverride) {
  return {
    id: override.id,
    escopoTipo: override.escopoTipo,
    escopoValor: override.escopoValor,
    ativo: override.ativo,
    createdAt: override.createdAt.toISOString(),
    updatedAt: override.updatedAt.toISOString(),
  };
}

function toResolutionResponse(resolucao: FeatureFlagResolution) {
  return { ativo: resolucao.ativo, origem: resolucao.origem };
}
