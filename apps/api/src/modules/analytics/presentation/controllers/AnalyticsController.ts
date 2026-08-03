import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { GetAnalyticsSummaryUseCase } from "../../application/use-cases/GetAnalyticsSummaryUseCase.js";

export class AnalyticsController {
  constructor(private readonly getAnalyticsSummaryUseCase: GetAnalyticsSummaryUseCase) {}

  summary = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const resumo = await this.getAnalyticsSummaryUseCase.execute(req.auth.tenantId);
    res.status(200).json(resumo);
  };
}
