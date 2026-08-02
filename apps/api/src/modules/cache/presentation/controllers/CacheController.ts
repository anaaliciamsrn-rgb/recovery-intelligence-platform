import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { GetCacheEntryUseCase } from "../../application/use-cases/GetCacheEntryUseCase.js";
import type { GetCacheStatsUseCase } from "../../application/use-cases/GetCacheStatsUseCase.js";
import type { InvalidateCacheUseCase } from "../../application/use-cases/InvalidateCacheUseCase.js";
import type { SetCacheEntryUseCase } from "../../application/use-cases/SetCacheEntryUseCase.js";
import {
  cacheIdentifierQuerySchema,
  setCacheEntryRequestSchema,
} from "../validators/cache.validators.js";

export class CacheController {
  constructor(
    private readonly setCacheEntryUseCase: SetCacheEntryUseCase,
    private readonly getCacheEntryUseCase: GetCacheEntryUseCase,
    private readonly invalidateCacheUseCase: InvalidateCacheUseCase,
    private readonly getCacheStatsUseCase: GetCacheStatsUseCase,
  ) {}

  set = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(setCacheEntryRequestSchema, req.body);
    const resultado = await this.setCacheEntryUseCase.execute({
      namespace: req.params.namespace ?? "",
      identifier: body.identifier ?? null,
      valor: body.valor,
      ttlSegundos: body.ttlSegundos ?? null,
    });
    res.status(200).json(resultado);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(cacheIdentifierQuerySchema, req.query);
    const resultado = await this.getCacheEntryUseCase.execute({
      namespace: req.params.namespace ?? "",
      identifier: query.identifier ?? null,
    });
    res.status(200).json(resultado);
  };

  invalidate = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(cacheIdentifierQuerySchema, req.query);
    const resultado = await this.invalidateCacheUseCase.execute({
      namespace: req.params.namespace ?? "",
      identifier: query.identifier ?? null,
    });
    res.status(200).json(resultado);
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.getCacheStatsUseCase.execute(req.params.namespace ?? "");
    res.status(200).json(resultado);
  };
}
