import { Fator } from "../../domain/value-objects/Fator.js";
import type {
  ClassificationRuleInput,
  IClassificationRule,
} from "../../application/ports/IClassificationRule.js";

function situacaoCadastral(valor: unknown): string | null {
  if (typeof valor !== "object" || valor === null || !("situacaoCadastral" in valor)) return null;
  const situacao = (valor as { situacaoCadastral: unknown }).situacaoCadastral;
  return typeof situacao === "string" ? situacao : null;
}

/**
 * Regra trivial: Receita Federal encontrada com `valor.situacaoCadastral`
 * diferente de "ATIVA" aumenta risco. Qualquer outra string (SUSPENSA,
 * BAIXADA, INAPTA etc.) é tratada igualmente como desfavorável — sem
 * distinção fina entre motivos, de propósito (ver ADR 0016).
 */
export class SituacaoCadastralReceitaRule implements IClassificationRule {
  readonly nome = "Situação Cadastral (Receita Federal)";

  avaliar(input: ClassificationRuleInput): Fator | null {
    if (input.receitaFederal.status !== "ENCONTRADO") return null;

    const situacao = situacaoCadastral(input.receitaFederal.valor);
    if (situacao === null) return null;

    const ativa = situacao === "ATIVA";

    return Fator.create({
      nome: this.nome,
      peso: 0.25,
      fonte: "RECEITA_FEDERAL",
      direcao: ativa ? "REDUZ_RISCO" : "AUMENTA_RISCO",
      justificativa: ativa
        ? "Situação cadastral na Receita Federal é ATIVA"
        : `Situação cadastral na Receita Federal é ${situacao}, não ATIVA`,
    });
  }
}
