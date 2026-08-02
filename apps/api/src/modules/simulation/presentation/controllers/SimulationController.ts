import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { RunSimulationUseCase } from "../../application/use-cases/RunSimulationUseCase.js";
import { runSimulationRequestSchema } from "../validators/simulation.validators.js";

export class SimulationController {
  constructor(private readonly runSimulationUseCase: RunSimulationUseCase) {}

  run = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(runSimulationRequestSchema, req.body);

    const resultado = await this.runSimulationUseCase.execute({
      dossieId: body.dossieId,
      changes: body.changes,
    });

    res.status(200).json(resultado);
  };
}
