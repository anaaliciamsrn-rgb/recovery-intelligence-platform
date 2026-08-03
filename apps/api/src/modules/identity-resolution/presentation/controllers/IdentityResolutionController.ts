import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { DossieSubjectType } from "../../../dossie/domain/value-objects/DossieSubjectType.js";
import type { IdentityMatchResult } from "../../domain/entities/IdentityMatchResult.js";
import type { FindDossieForCandidateUseCase } from "../../application/use-cases/FindDossieForCandidateUseCase.js";
import type { ResolveIdentityUseCase } from "../../application/use-cases/ResolveIdentityUseCase.js";
import { resolveIdentityRequestSchema } from "../validators/identity-resolution.validators.js";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Mesma inferência já usada em `RelationshipGraphPage` (frontend) e no fluxo de import: 11 dígitos é CPF/PESSOA, 14 é CNPJ/EMPRESA. */
function inferSubjectType(documento: string): DossieSubjectType | null {
  const digitos = onlyDigits(documento);
  if (digitos.length === 11) return "PESSOA";
  if (digitos.length === 14) return "EMPRESA";
  return null;
}

export class IdentityResolutionController {
  constructor(
    private readonly resolveIdentityUseCase: ResolveIdentityUseCase,
    private readonly findDossieForCandidateUseCase: FindDossieForCandidateUseCase,
  ) {}

  resolve = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const body = parseRequestBody(resolveIdentityRequestSchema, req.body);

    const results = await this.resolveIdentityUseCase.execute({
      documento: body.documento,
      nome: body.nome ?? null,
    });

    const matches = await Promise.all(
      results.map((result) => this.toResponse(result, req.auth!.tenantId)),
    );

    res.status(200).json({ matches });
  };

  private async toResponse(result: IdentityMatchResult, tenantId: string) {
    const subjectType = inferSubjectType(result.candidateDocumento);
    const dossie = subjectType
      ? await this.findDossieForCandidateUseCase.execute({
          tenantId,
          subjectType,
          subjectId: result.candidateId,
        })
      : null;

    return {
      candidateId: result.candidateId,
      candidateSourceType: result.candidateSourceType,
      candidateNome: result.candidateNome,
      candidateDocumento: result.candidateDocumento,
      confidenceScore: result.confidenceScore.toNumber(),
      nivelConfianca: result.confidenceScore.nivel(),
      decision: result.decision,
      signals: result.signals.map((signal) => ({
        tipo: signal.tipo,
        peso: signal.peso,
        favoravel: signal.favoravel,
        descricao: signal.descricao,
      })),
      dossie,
    };
  }
}
