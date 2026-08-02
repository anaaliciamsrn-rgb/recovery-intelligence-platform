import type { Request, Response } from "express";
import type { GetConfidenceHeatmapUseCase } from "../../application/use-cases/GetConfidenceHeatmapUseCase.js";

export class ConfidenceHeatmapController {
  constructor(private readonly getConfidenceHeatmapUseCase: GetConfidenceHeatmapUseCase) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const heatmap = await this.getConfidenceHeatmapUseCase.execute(req.params.dossieId ?? "");
    res.status(200).json(heatmap);
  };
}
