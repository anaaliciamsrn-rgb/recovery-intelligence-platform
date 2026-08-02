import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { Dossie, DossieEvidencias } from "../../domain/entities/Dossie.js";
import type { CreateDossieUseCase } from "../../application/use-cases/CreateDossieUseCase.js";
import type { GetDossieUseCase } from "../../application/use-cases/GetDossieUseCase.js";
import type { RegistrarEvidenciaUseCase } from "../../application/use-cases/RegistrarEvidenciaUseCase.js";
import {
  createDossieRequestSchema,
  registrarEvidenciaRequestSchema,
} from "../validators/dossie.validators.js";

export class DossieController {
  constructor(
    private readonly createDossieUseCase: CreateDossieUseCase,
    private readonly getDossieUseCase: GetDossieUseCase,
    private readonly registrarEvidenciaUseCase: RegistrarEvidenciaUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createDossieRequestSchema, req.body);
    const dossie = await this.createDossieUseCase.execute(body);
    res.status(201).json(dossie);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const dossie = await this.getDossieUseCase.execute(req.params.id ?? "");
    res.status(200).json(toResponse(dossie));
  };

  registrarEvidencia = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registrarEvidenciaRequestSchema, req.body);
    await this.registrarEvidenciaUseCase.execute({
      dossieId: req.params.id ?? "",
      fonte: body.fonte,
      status: body.status,
      valor: body.valor ?? null,
      confidenceScore: body.confidenceScore ?? null,
      motivoErro: body.motivoErro ?? null,
    });
    res.status(204).send();
  };
}

function toResponse(dossie: Dossie) {
  const evidencias = dossie.evidencias;
  return {
    id: dossie.id,
    subjectType: dossie.subjectType,
    subjectId: dossie.subjectId,
    geradoEm: dossie.geradoEm,
    evidencias: {
      pgfn: toEvidenceResponse(evidencias.pgfn),
      dataJud: toEvidenceResponse(evidencias.dataJud),
      receitaFederal: toEvidenceResponse(evidencias.receitaFederal),
      portalTransparencia: toEvidenceResponse(evidencias.portalTransparencia),
      cenprot: toEvidenceResponse(evidencias.cenprot),
    } satisfies Record<keyof DossieEvidencias, unknown>,
  };
}

function toEvidenceResponse(evidence: Evidence<unknown>) {
  switch (evidence.status) {
    case "ENCONTRADO":
      return {
        status: evidence.status,
        valor: evidence.valor,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta,
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case "NAO_ENCONTRADO":
      return {
        status: evidence.status,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta,
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case "NAO_CONSULTADO":
      return { status: evidence.status, fonte: evidence.fonte };
    case "ERRO_CONSULTA":
      return {
        status: evidence.status,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta,
        motivoErro: evidence.motivoErro,
      };
  }
}
