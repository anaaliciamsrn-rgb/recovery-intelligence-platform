import type { VersionSnapshot } from "../entities/VersionSnapshot.js";
import type {
  DossieEvidenciasSnapshot,
  EvidenciaSnapshot,
  FatorSnapshot,
  RecomendacaoSnapshotItem,
} from "../value-objects/SnapshotContent.js";
import type {
  EvidenciaDiffEntry,
  FatorDiffEntry,
  RecomendacaoDiffEntry,
  TipoMudanca,
  VersionDiff,
} from "../value-objects/VersionDiff.js";

const FONTES: (keyof DossieEvidenciasSnapshot)[] = [
  "pgfn",
  "dataJud",
  "receitaFederal",
  "portalTransparencia",
  "cenprot",
];

function estavelmenteIgual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

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

function tipoDeEvidencia(anterior: EvidenciaSnapshot, atual: EvidenciaSnapshot): TipoMudanca {
  const anteriorConsultada = anterior.status !== "NAO_CONSULTADO";
  const atualConsultada = atual.status !== "NAO_CONSULTADO";

  if (!anteriorConsultada && atualConsultada) return "ADICIONADA";
  if (anteriorConsultada && !atualConsultada) return "REMOVIDA";
  if (estavelmenteIgual(anterior, atual)) return "INALTERADA";
  return "ALTERADA";
}

/**
 * Compara duas versões do mesmo Dossiê e produz a diferença estrutural —
 * puro, sem I/O. Só entradas efetivamente mudadas aparecem em
 * `evidencias`/`fatores`/`recomendacoes` (nenhuma entrada "INALTERADA" é
 * incluída) — a resposta responde diretamente "o que mudou", não "o
 * estado completo de novo". Ver ADR 0022.
 */
export class VersionDiffService {
  static diff(anterior: VersionSnapshot, atual: VersionSnapshot): VersionDiff {
    if (anterior.dossieId !== atual.dossieId) {
      throw new Error("Não é possível comparar versões de dossiês diferentes");
    }

    return {
      dossieId: anterior.dossieId,
      versaoAnterior: anterior.versao,
      versaoAtual: atual.versao,
      evidencias: this.diffEvidencias(anterior.evidencias, atual.evidencias),
      classificacao: {
        anterior: anterior.classificacao,
        atual: atual.classificacao,
        mudou: anterior.classificacao !== atual.classificacao,
      },
      riskScore: {
        anterior: anterior.riskScore,
        atual: atual.riskScore,
        mudou: anterior.riskScore !== atual.riskScore,
      },
      confidenceScore: {
        anterior: anterior.confidenceScore,
        atual: atual.confidenceScore,
        mudou: anterior.confidenceScore !== atual.confidenceScore,
      },
      fatores: this.diffFatores(anterior.fatores, atual.fatores),
      recomendacoes: this.diffRecomendacoes(anterior.recomendacoes, atual.recomendacoes),
      promptMudou: anterior.prompt.texto !== atual.prompt.texto,
    };
  }

  private static diffEvidencias(
    anterior: DossieEvidenciasSnapshot,
    atual: DossieEvidenciasSnapshot,
  ): EvidenciaDiffEntry[] {
    const entradas: EvidenciaDiffEntry[] = [];
    for (const fonte of FONTES) {
      const tipo = tipoDeEvidencia(anterior[fonte], atual[fonte]);
      if (tipo !== "INALTERADA") entradas.push({ fonte, tipo });
    }
    return entradas;
  }

  private static diffFatores(anterior: FatorSnapshot[], atual: FatorSnapshot[]): FatorDiffEntry[] {
    const anteriorPorNome = new Map(anterior.map((fator) => [fator.nome, fator]));
    const atualPorNome = new Map(atual.map((fator) => [fator.nome, fator]));
    const nomes = new Set([...anteriorPorNome.keys(), ...atualPorNome.keys()]);

    const entradas: FatorDiffEntry[] = [];
    for (const nome of nomes) {
      const antes = anteriorPorNome.get(nome);
      const depois = atualPorNome.get(nome);
      const tipo: TipoMudanca = !antes
        ? "ADICIONADA"
        : !depois
          ? "REMOVIDA"
          : estavelmenteIgual(antes, depois)
            ? "INALTERADA"
            : "ALTERADA";
      if (tipo !== "INALTERADA") entradas.push({ nome, tipo });
    }
    return entradas;
  }

  private static diffRecomendacoes(
    anterior: RecomendacaoSnapshotItem[],
    atual: RecomendacaoSnapshotItem[],
  ): RecomendacaoDiffEntry[] {
    const anteriorPorCanal = new Map(
      anterior.map((recomendacao) => [recomendacao.canal, recomendacao]),
    );
    const atualPorCanal = new Map(atual.map((recomendacao) => [recomendacao.canal, recomendacao]));
    const canais = new Set([...anteriorPorCanal.keys(), ...atualPorCanal.keys()]);

    const entradas: RecomendacaoDiffEntry[] = [];
    for (const canal of canais) {
      const antes = anteriorPorCanal.get(canal);
      const depois = atualPorCanal.get(canal);
      const tipo: TipoMudanca = !antes
        ? "ADICIONADA"
        : !depois
          ? "REMOVIDA"
          : estavelmenteIgual(antes, depois)
            ? "INALTERADA"
            : "ALTERADA";
      if (tipo !== "INALTERADA") entradas.push({ canal, tipo });
    }
    return entradas;
  }
}
