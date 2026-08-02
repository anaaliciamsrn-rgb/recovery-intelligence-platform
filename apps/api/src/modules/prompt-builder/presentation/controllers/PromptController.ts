import type { Request, Response } from "express";
import { PromptBuilder } from "../../domain/services/PromptBuilder.js";
import type { BuildPromptUseCase } from "../../application/use-cases/BuildPromptUseCase.js";

export class PromptController {
  constructor(private readonly buildPromptUseCase: BuildPromptUseCase) {}

  build = async (req: Request, res: Response): Promise<void> => {
    const context = await this.buildPromptUseCase.execute(req.params.dossieId ?? "");

    res.status(200).json({
      structured: PromptBuilder.toStructuredJson(context),
      text: PromptBuilder.toTextPrompt(context),
    });
  };
}
