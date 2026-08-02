import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { GetEmpresaByCnpjUseCase } from "../../application/use-cases/GetEmpresaByCnpjUseCase.js";
import type { GetEmpresaByIdUseCase } from "../../application/use-cases/GetEmpresaByIdUseCase.js";
import type { RegisterEmpresaUseCase } from "../../application/use-cases/RegisterEmpresaUseCase.js";
import { registerEmpresaRequestSchema } from "../validators/empresa.validators.js";

export class EmpresaController {
  constructor(
    private readonly registerEmpresaUseCase: RegisterEmpresaUseCase,
    private readonly getEmpresaByCnpjUseCase: GetEmpresaByCnpjUseCase,
    private readonly getEmpresaByIdUseCase: GetEmpresaByIdUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registerEmpresaRequestSchema, req.body);
    const empresa = await this.registerEmpresaUseCase.execute(body);
    res.status(201).json(empresa);
  };

  getByCnpj = async (req: Request, res: Response): Promise<void> => {
    const empresa = await this.getEmpresaByCnpjUseCase.execute(req.params.cnpj ?? "");
    res.status(200).json(empresa);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const empresa = await this.getEmpresaByIdUseCase.execute(req.params.id ?? "");
    res.status(200).json(empresa);
  };
}
