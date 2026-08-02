import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { IdentityMatchResult } from "../../domain/entities/IdentityMatchResult.js";
import type { ResolveIdentityUseCase } from "../../application/use-cases/ResolveIdentityUseCase.js";
import { resolveIdentityRequestSchema } from "../validators/identity-resolution.validators.js";

export class IdentityResolutionController {
  constructor(private readonly resolveIdentityUseCase: ResolveIdentityUseCase) {}

  resolve = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(resolveIdentityRequestSchema, req.body);

    const results = await this.resolveIdentityUseCase.execute({
      documento: body.documento,
      nome: body.nome ?? null,
    });

    res.status(200).json({ matches: results.map(toResponse) });
  };
}

function toResponse(result: IdentityMatchResult) {
  return {
    candidateId: result.candidateId,
    candidateSourceType: result.candidateSourceType,
    confidenceScore: result.confidenceScore.toNumber(),
    nivelConfianca: result.confidenceScore.nivel(),
    decision: result.decision,
    signals: result.signals.map((signal) => ({
      tipo: signal.tipo,
      peso: signal.peso,
      favoravel: signal.favoravel,
      descricao: signal.descricao,
    })),
  };
}
