import type {
  DossieEvidenciasSnapshot,
  EvidenciaSnapshot,
  SimulationStateSnapshot,
} from "../value-objects/SimulationStateSnapshot.js";

const NOME_FONTE: Record<keyof DossieEvidenciasSnapshot, string> = {
  pgfn: "PGFN",
  dataJud: "DataJud",
  receitaFederal: "Receita Federal",
  portalTransparencia: "Portal da Transparência",
  cenprot: "CENPROT",
};

const FONTES = Object.keys(NOME_FONTE) as (keyof DossieEvidenciasSnapshot)[];

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((chave) => [chave, canonicalize((value as Record<string, unknown>)[chave])]),
    );
  }
  return value;
}

function estavelmenteIgual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

/**
 * Compara o estado "antes" e "depois" de uma simulação e produz a lista de
 * "mudanças detectadas" em linguagem simples — puro, sem I/O, mesma
 * técnica de comparação estável de `VersionDiffService` (dossier-versioning,
 * ADR 0022), duplicada aqui deliberadamente (módulos-etapa irmãos não
 * dependem um do outro — ver ADR 0023).
 */
export class SimulationDiffService {
  static detectarMudancas(
    antes: SimulationStateSnapshot,
    depois: SimulationStateSnapshot,
  ): string[] {
    const linhas: string[] = [];

    for (const fonte of FONTES) {
      const evidenciaAntes = antes.evidencias[fonte];
      const evidenciaDepois = depois.evidencias[fonte];
      const consultadaAntes = evidenciaAntes.status !== "NAO_CONSULTADO";
      const consultadaDepois = evidenciaDepois.status !== "NAO_CONSULTADO";

      if (!consultadaAntes && consultadaDepois) {
        linhas.push(`${NOME_FONTE[fonte]} adicionada`);
      } else if (consultadaAntes && !consultadaDepois) {
        linhas.push(`${NOME_FONTE[fonte]} removida`);
      } else if (
        consultadaAntes &&
        consultadaDepois &&
        !this.evidenciaIgual(evidenciaAntes, evidenciaDepois)
      ) {
        linhas.push(`${NOME_FONTE[fonte]} alterada`);
      } else if (consultadaAntes && consultadaDepois) {
        linhas.push(`${NOME_FONTE[fonte]} permanece`);
      }
    }

    if (depois.confidenceScore > antes.confidenceScore) linhas.push("confiança aumentou");
    else if (depois.confidenceScore < antes.confidenceScore) linhas.push("confiança diminuiu");

    if (depois.riskScore > antes.riskScore) linhas.push("risco subiu");
    else if (depois.riskScore < antes.riskScore) linhas.push("risco caiu");

    if (antes.classificacao !== depois.classificacao) {
      linhas.push(`classificação mudou de ${antes.classificacao} para ${depois.classificacao}`);
    }

    const canalAntes = antes.recomendacoes[0]?.canal;
    const canalDepois = depois.recomendacoes[0]?.canal;
    if (canalAntes !== canalDepois) {
      linhas.push(
        `recomendação principal mudou de ${canalAntes ?? "nenhuma"} para ${canalDepois ?? "nenhuma"}`,
      );
    }

    return linhas;
  }

  private static evidenciaIgual(a: EvidenciaSnapshot, b: EvidenciaSnapshot): boolean {
    return estavelmenteIgual(a, b);
  }
}
