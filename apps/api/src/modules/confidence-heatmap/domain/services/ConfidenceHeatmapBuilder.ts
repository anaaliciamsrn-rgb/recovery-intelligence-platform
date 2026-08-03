import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { Fator } from "../../../classification/domain/value-objects/Fator.js";
import type { SourceConfidenceEntry } from "../value-objects/SourceConfidenceEntry.js";

const FONTES: { campo: keyof DossieEvidencias; fonte: DossieFonte }[] = [
  { campo: "pgfn", fonte: "PGFN" },
  { campo: "dataJud", fonte: "DATAJUD" },
  { campo: "receitaFederal", fonte: "RECEITA_FEDERAL" },
  { campo: "portalTransparencia", fonte: "PORTAL_TRANSPARENCIA" },
  { campo: "cenprot", fonte: "CENPROT" },
];

function confidenceScoreDe(evidence: Evidence<unknown>): number | null {
  return evidence.status === "ENCONTRADO" || evidence.status === "NAO_ENCONTRADO"
    ? evidence.confidenceScore.toNumber()
    : null;
}

/**
 * Constrói o heatmap de confiança a partir do estado atual das evidências
 * e dos fatores já computados pela classificação — puro, sem I/O. A
 * "contribuição percentual" de cada fonte é a participação da sua própria
 * `confidenceScore` na soma das confidenceScore de todas as fontes
 * respondidas — uma métrica própria deste módulo, deliberadamente
 * diferente da confiança agregada de `CalculadoraConfianca` (classification,
 * ADR 0016), que só mede fração de fontes respondidas, não pondera pelo
 * valor de cada uma. Ver ADR 0024.
 */
export class ConfidenceHeatmapBuilder {
  static build(
    evidencias: Readonly<DossieEvidencias>,
    fatores: Fator[],
  ): {
    entradas: SourceConfidenceEntry[];
    fontesAusentes: DossieFonte[];
    fontesConflitantes: DossieFonte[];
  } {
    const scoresPorFonte = FONTES.map(({ campo, fonte }) => ({
      fonte,
      status: evidencias[campo].status,
      score: confidenceScoreDe(evidencias[campo]),
    }));
    const somaScores = scoresPorFonte.reduce((total, item) => total + (item.score ?? 0), 0);

    const entradas: SourceConfidenceEntry[] = scoresPorFonte.map(({ fonte, status, score }) => ({
      fonte,
      status,
      confidenceScore: score,
      contribuicaoPercentual:
        score !== null && somaScores > 0 ? Number(((score / somaScores) * 100).toFixed(2)) : 0,
    }));

    const fontesAusentes = scoresPorFonte
      .filter((item) => item.status === "NAO_CONSULTADO")
      .map((item) => item.fonte);
    const fontesConflitantes = this.detectarConflitos(fatores);

    return { entradas, fontesAusentes, fontesConflitantes };
  }

  private static detectarConflitos(fatores: Fator[]): DossieFonte[] {
    const temAumenta = fatores.some((fator) => fator.direcao === "AUMENTA_RISCO");
    const temReduz = fatores.some((fator) => fator.direcao === "REDUZ_RISCO");
    if (!temAumenta || !temReduz) return [];

    return fatores.map((fator) => fator.fonte);
  }
}
