import type { Request, Response } from "express";
import type { GerarRecomendacoesOutput } from "../../application/use-cases/GerarRecomendacoesUseCase.js";
import type { GerarRecomendacoesUseCase } from "../../application/use-cases/GerarRecomendacoesUseCase.js";

export class RecommendationController {
  constructor(private readonly gerarRecomendacoesUseCase: GerarRecomendacoesUseCase) {}

  gerar = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.gerarRecomendacoesUseCase.execute(req.params.dossieId ?? "");
    res.status(200).json(toResponse(resultado));
  };
}

function toResponse(resultado: GerarRecomendacoesOutput) {
  return {
    dossieId: resultado.dossieId,
    classificacao: resultado.classificacao,
    recomendacoes: resultado.recomendacoes.map((recomendacao) => ({
      canal: recomendacao.canal,
      justificativa: recomendacao.justificativa,
    })),
  };
}
