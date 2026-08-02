import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { EncerrarParticipacaoSocietariaUseCase } from "../../application/use-cases/EncerrarParticipacaoSocietariaUseCase.js";
import type { ListParticipacoesByEmpresaUseCase } from "../../application/use-cases/ListParticipacoesByEmpresaUseCase.js";
import type { ListParticipacoesByPessoaUseCase } from "../../application/use-cases/ListParticipacoesByPessoaUseCase.js";
import type { RegisterParticipacaoSocietariaUseCase } from "../../application/use-cases/RegisterParticipacaoSocietariaUseCase.js";
import {
  encerrarParticipacaoSocietariaRequestSchema,
  listParticipacoesQuerySchema,
  registerParticipacaoSocietariaRequestSchema,
} from "../validators/participacao-societaria.validators.js";

export class ParticipacaoSocietariaController {
  constructor(
    private readonly registerUseCase: RegisterParticipacaoSocietariaUseCase,
    private readonly encerrarUseCase: EncerrarParticipacaoSocietariaUseCase,
    private readonly listByEmpresaUseCase: ListParticipacoesByEmpresaUseCase,
    private readonly listByPessoaUseCase: ListParticipacoesByPessoaUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registerParticipacaoSocietariaRequestSchema, req.body);
    const participacao = await this.registerUseCase.execute({
      pessoaId: body.pessoaId,
      empresaId: body.empresaId,
      papel: body.papel,
      percentualParticipacao: body.percentualParticipacao ?? null,
      dataEntrada: body.dataEntrada ?? null,
    });
    res.status(201).json(participacao);
  };

  encerrar = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(encerrarParticipacaoSocietariaRequestSchema, req.body);
    await this.encerrarUseCase.execute({
      id: req.params.id ?? "",
      dataSaida: body.dataSaida ?? null,
    });
    res.status(204).send();
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseRequestBody(listParticipacoesQuerySchema, req.query);

    const participacoes = query.empresaId
      ? await this.listByEmpresaUseCase.execute(query.empresaId)
      : await this.listByPessoaUseCase.execute(query.pessoaId ?? "");

    res.status(200).json({ participacoes });
  };
}
