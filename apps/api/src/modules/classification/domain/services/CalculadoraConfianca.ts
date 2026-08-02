import { ConfidenceScore } from "../../../../domain/value-objects/ConfidenceScore.js";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";

/**
 * Confiança na classificação é proporcional à fração de evidências
 * efetivamente respondidas (`ENCONTRADO`/`NAO_ENCONTRADO`) sobre o total —
 * `NAO_CONSULTADO`/`ERRO_CONSULTA` reduzem a confiança sem impedir a
 * classificação de acontecer (o motor sempre produz um resultado, mesmo com
 * dados incompletos; a confiança é que reflete essa incompletude). Recebe
 * um array de `Evidence`, não um `Dossie` — mantém o domínio deste módulo
 * desacoplado do domínio de `dossie` (só a application layer conhece as
 * duas). Ver ADR 0016.
 */
export class CalculadoraConfianca {
  static calcular(evidencias: Evidence<unknown>[]): ConfidenceScore {
    if (evidencias.length === 0) {
      return ConfidenceScore.create(0);
    }

    const respondidas = evidencias.filter(
      (evidencia) => evidencia.status === "ENCONTRADO" || evidencia.status === "NAO_ENCONTRADO",
    ).length;

    return ConfidenceScore.create(respondidas / evidencias.length);
  }
}
