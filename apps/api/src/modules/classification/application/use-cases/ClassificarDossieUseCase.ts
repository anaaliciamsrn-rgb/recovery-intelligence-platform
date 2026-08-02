import { AppError } from "../../../../application/errors/AppError.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import { ClassificacaoResultado } from "../../domain/entities/ClassificacaoResultado.js";
import { CalculadoraConfianca } from "../../domain/services/CalculadoraConfianca.js";
import { ClassificacaoRiscoScorer } from "../../domain/services/ClassificacaoRiscoScorer.js";
import type { Fator } from "../../domain/value-objects/Fator.js";
import type { ClassificationRuleInput, IClassificationRule } from "../ports/IClassificationRule.js";

/**
 * Orquestra o Explainable Rule Engine: busca o Dossiê, roda todas as regras
 * registradas, agrega os fatores num score+confiança, e monta a
 * justificativa geral. Stateless — não persiste o resultado (mesma decisão
 * de `ResolveIdentityUseCase`, ADR 0013). Ver ADR 0016.
 */
export class ClassificarDossieUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly rules: IClassificationRule[],
  ) {}

  async execute(dossieId: string): Promise<ClassificacaoResultado> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const evidencias = dossie.evidencias;
    const input: ClassificationRuleInput = {
      pgfn: evidencias.pgfn,
      dataJud: evidencias.dataJud,
      receitaFederal: evidencias.receitaFederal,
      portalTransparencia: evidencias.portalTransparencia,
      cenprot: evidencias.cenprot,
    };

    const fatores = this.rules
      .map((rule) => rule.avaliar(input))
      .filter((fator): fator is Fator => fator !== null);

    const score = ClassificacaoRiscoScorer.score(fatores);
    const confianca = CalculadoraConfianca.calcular([
      input.pgfn,
      input.dataJud,
      input.receitaFederal,
      input.portalTransparencia,
      input.cenprot,
    ]);

    return ClassificacaoResultado.create({
      dossieId,
      score,
      classe: score.classe(),
      fatores,
      justificativaGeral: this.buildJustificativaGeral(fatores),
      confianca,
    });
  }

  private buildJustificativaGeral(fatores: Fator[]): string {
    if (fatores.length === 0) {
      return "Nenhuma regra pôde ser avaliada — todas as evidências necessárias estão pendentes de consulta.";
    }

    const partes = fatores.map(
      (fator) =>
        `${fator.nome} (peso ${fator.peso.toFixed(2)}, ${fator.direcao === "AUMENTA_RISCO" ? "aumenta" : "reduz"} risco): ${fator.justificativa}`,
    );
    return partes.join(" | ");
  }
}
