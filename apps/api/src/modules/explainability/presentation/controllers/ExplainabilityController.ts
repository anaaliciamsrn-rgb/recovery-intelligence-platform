import type { Request, Response } from "express";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { ClassificationExplanation } from "../../domain/entities/ClassificationExplanation.js";
import type { FatorExplicado } from "../../domain/value-objects/FatorExplicado.js";
import type { GetClassificationExplanationUseCase } from "../../application/use-cases/GetClassificationExplanationUseCase.js";

export class ExplainabilityController {
  constructor(
    private readonly getClassificationExplanationUseCase: GetClassificationExplanationUseCase,
  ) {}

  obterExplicacao = async (req: Request, res: Response): Promise<void> => {
    const explanation = await this.getClassificationExplanationUseCase.execute(req.params.id ?? "");
    res.status(200).json(toResponse(explanation));
  };
}

function toResponse(explanation: ClassificationExplanation) {
  return {
    dossieId: explanation.dossieId,
    geradoEm: explanation.geradoEm.toISOString(),
    score: {
      final: explanation.score.toNumber(),
      classe: explanation.classe,
    },
    confianca: {
      valor: explanation.confianca.toNumber(),
      nivel: explanation.confianca.nivel(),
    },
    justificativaGeral: explanation.justificativaGeral,
    fatores: explanation.fatores.map(toFatorResponse),
    recomendacoes: explanation.recomendacoes,
    timeline: explanation.timeline.map((evento) => ({
      etapa: evento.etapa,
      descricao: evento.descricao,
      timestamp: evento.timestamp ? evento.timestamp.toISOString() : null,
    })),
  };
}

function toFatorResponse(fator: FatorExplicado) {
  return {
    nome: fator.nome,
    peso: fator.peso,
    direcao: fator.direcao,
    impacto: fator.impacto,
    justificativa: fator.justificativa,
    fonte: fator.fonte,
    evidencia: toEvidenceResponse(fator.evidencia),
  };
}

function toEvidenceResponse(evidence: Evidence<unknown>) {
  switch (evidence.status) {
    case "ENCONTRADO":
      return {
        status: evidence.status,
        valor: evidence.valor,
        dataConsulta: evidence.dataConsulta.toISOString(),
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case "NAO_ENCONTRADO":
      return {
        status: evidence.status,
        dataConsulta: evidence.dataConsulta.toISOString(),
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case "NAO_CONSULTADO":
      return { status: evidence.status };
    case "ERRO_CONSULTA":
      return {
        status: evidence.status,
        dataConsulta: evidence.dataConsulta.toISOString(),
        motivoErro: evidence.motivoErro,
      };
  }
}
