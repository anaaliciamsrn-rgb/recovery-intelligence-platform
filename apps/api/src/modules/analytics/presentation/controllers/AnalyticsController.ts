import type { Request, Response } from "express";
import type { GetAnalyticsSummaryUseCase } from "../../application/use-cases/GetAnalyticsSummaryUseCase.js";

export class AnalyticsController {
  constructor(private readonly getAnalyticsSummaryUseCase: GetAnalyticsSummaryUseCase) {}

  summary = async (_req: Request, res: Response): Promise<void> => {
    const resumo = await this.getAnalyticsSummaryUseCase.execute();
    res.status(200).json(resumo);
  };
}
