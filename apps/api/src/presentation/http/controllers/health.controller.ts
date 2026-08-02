import type { Request, Response } from "express";
import type { GetSystemHealthUseCase } from "../../../application/use-cases/get-system-health.use-case.js";

export class HealthController {
  constructor(private readonly getSystemHealthUseCase: GetSystemHealthUseCase) {}

  handle = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.getSystemHealthUseCase.execute();
    const statusCode = result.status === "ok" ? 200 : 503;
    res.status(statusCode).json(result);
  };
}
