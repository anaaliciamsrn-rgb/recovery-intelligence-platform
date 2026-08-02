import type { Request, Response } from "express";
import type { ClassificacaoResultado } from "../../domain/entities/ClassificacaoResultado.js";
import type { ClassificarDossieUseCase } from "../../application/use-cases/ClassificarDossieUseCase.js";

export class ClassificacaoController {
  constructor(private readonly classificarDossieUseCase: ClassificarDossieUseCase) {}

  classificar = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.classificarDossieUseCase.execute(req.params.dossieId ?? "");
    res.status(200).json(toResponse(resultado));
  };
}

function toResponse(resultado: ClassificacaoResultado) {
  return {
    dossieId: resultado.dossieId,
    score: resultado.score.toNumber(),
    classe: resultado.classe,
    confianca: resultado.confianca.toNumber(),
    nivelConfianca: resultado.confianca.nivel(),
    justificativaGeral: resultado.justificativaGeral,
    fatores: resultado.fatores.map((fator) => ({
      nome: fator.nome,
      peso: fator.peso,
      direcao: fator.direcao,
      justificativa: fator.justificativa,
    })),
  };
}
