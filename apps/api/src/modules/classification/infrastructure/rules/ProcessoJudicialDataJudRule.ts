import { Fator } from "../../domain/value-objects/Fator.js";
import type {
  ClassificationRuleInput,
  IClassificationRule,
} from "../../application/ports/IClassificationRule.js";

function temProcesso(valor: unknown): boolean | null {
  if (typeof valor !== "object" || valor === null || !("temProcesso" in valor)) return null;
  const flag = (valor as { temProcesso: unknown }).temProcesso;
  return typeof flag === "boolean" ? flag : null;
}

/**
 * Regra trivial: DataJud encontrado + `valor.temProcesso === true` aumenta
 * risco; `false` reduz. Ver ADR 0016.
 */
export class ProcessoJudicialDataJudRule implements IClassificationRule {
  readonly nome = "Processo Judicial (DataJud)";

  avaliar(input: ClassificationRuleInput): Fator | null {
    if (input.dataJud.status !== "ENCONTRADO") return null;

    const processo = temProcesso(input.dataJud.valor);
    if (processo === null) return null;

    return Fator.create({
      nome: this.nome,
      peso: 0.35,
      fonte: "DATAJUD",
      direcao: processo ? "AUMENTA_RISCO" : "REDUZ_RISCO",
      justificativa: processo
        ? "DataJud reporta processo judicial ativo envolvendo o sujeito"
        : "DataJud não reporta nenhum processo judicial ativo",
    });
  }
}
