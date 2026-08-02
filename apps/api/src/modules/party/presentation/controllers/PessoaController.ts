import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { GetPessoaByCpfUseCase } from "../../application/use-cases/GetPessoaByCpfUseCase.js";
import type { GetPessoaByIdUseCase } from "../../application/use-cases/GetPessoaByIdUseCase.js";
import type { RegisterPessoaUseCase } from "../../application/use-cases/RegisterPessoaUseCase.js";
import { registerPessoaRequestSchema } from "../validators/pessoa.validators.js";

export class PessoaController {
  constructor(
    private readonly registerPessoaUseCase: RegisterPessoaUseCase,
    private readonly getPessoaByCpfUseCase: GetPessoaByCpfUseCase,
    private readonly getPessoaByIdUseCase: GetPessoaByIdUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registerPessoaRequestSchema, req.body);
    const pessoa = await this.registerPessoaUseCase.execute(body);
    res.status(201).json(pessoa);
  };

  getByCpf = async (req: Request, res: Response): Promise<void> => {
    const pessoa = await this.getPessoaByCpfUseCase.execute(req.params.cpf ?? "");
    res.status(200).json(pessoa);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const pessoa = await this.getPessoaByIdUseCase.execute(req.params.id ?? "");
    res.status(200).json(pessoa);
  };
}
