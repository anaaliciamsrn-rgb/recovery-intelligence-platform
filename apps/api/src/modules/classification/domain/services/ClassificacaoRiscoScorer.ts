import { RiskScore } from "../value-objects/RiskScore.js";
import type { Fator } from "../value-objects/Fator.js";

/**
 * Serviço de domínio puro — sem I/O. Agrega os fatores produzidos pelas
 * regras (`IClassificationRule`) num único `RiskScore`, por média ponderada
 * (fração do peso total que "empurrou" para risco). Deliberadamente simples
 * — o requisito é um motor de regras explicável, não Machine Learning (ver
 * ADR 0016). Mesma estrutura de `IdentityMatchScorer` (ADR 0013) — reutilizar
 * o padrão, não o código, entre módulos que não devem se acoplar.
 */
export class ClassificacaoRiscoScorer {
  static score(fatores: Fator[]): RiskScore {
    if (fatores.length === 0) {
      return RiskScore.create(0);
    }

    const pesoTotal = fatores.reduce((total, fator) => total + fator.peso, 0);
    const pesoDeRisco = fatores
      .filter((fator) => fator.direcao === "AUMENTA_RISCO")
      .reduce((total, fator) => total + fator.peso, 0);

    return RiskScore.create(pesoTotal > 0 ? pesoDeRisco / pesoTotal : 0);
  }
}
