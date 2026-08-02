import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { Fator } from "../../domain/value-objects/Fator.js";

export interface ClassificationRuleInput {
  pgfn: Evidence<unknown>;
  dataJud: Evidence<unknown>;
  receitaFederal: Evidence<unknown>;
  portalTransparencia: Evidence<unknown>;
  cenprot: Evidence<unknown>;
}

/**
 * Contrato de uma regra do Explainable Rule Engine. `avaliar` devolve `null`
 * quando a regra não se aplica (ex.: a evidência de que ela depende ainda
 * está `NAO_CONSULTADO`) — nunca um `Fator` "neutro" placeholder. Cada
 * implementação concreta é deliberadamente trivial (comparações estruturais
 * simples, sem ML) — ver ADR 0016.
 */
export interface IClassificationRule {
  readonly nome: string;
  avaliar(input: ClassificationRuleInput): Fator | null;
}
