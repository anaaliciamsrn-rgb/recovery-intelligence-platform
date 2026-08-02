import { Fator } from "../../domain/value-objects/Fator.js";
import type {
  ClassificationRuleInput,
  IClassificationRule,
} from "../../application/ports/IClassificationRule.js";

function temPendencia(valor: unknown): boolean | null {
  if (typeof valor !== "object" || valor === null || !("temPendencia" in valor)) return null;
  const flag = (valor as { temPendencia: unknown }).temPendencia;
  return typeof flag === "boolean" ? flag : null;
}

/**
 * Regra trivial: PGFN encontrada + `valor.temPendencia === true` aumenta
 * risco; `false` reduz. Sem evidência respondida, ou formato inesperado de
 * `valor`, a regra não se aplica (`null`) — ver ADR 0016.
 */
export class PendenciaFiscalPgfnRule implements IClassificationRule {
  readonly nome = "Pendência Fiscal (PGFN)";

  avaliar(input: ClassificationRuleInput): Fator | null {
    if (input.pgfn.status !== "ENCONTRADO") return null;

    const pendencia = temPendencia(input.pgfn.valor);
    if (pendencia === null) return null;

    return Fator.create({
      nome: this.nome,
      peso: 0.4,
      direcao: pendencia ? "AUMENTA_RISCO" : "REDUZ_RISCO",
      justificativa: pendencia
        ? "PGFN reporta pendência fiscal em aberto"
        : "PGFN não reporta nenhuma pendência fiscal",
    });
  }
}
