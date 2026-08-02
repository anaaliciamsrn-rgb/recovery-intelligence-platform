import type { SimulationChange } from "../value-objects/SimulationChange.js";
import type { SimulationImpactEntry } from "../value-objects/SimulationImpactEntry.js";
import type {
  FatorSnapshot,
  SimulationStateSnapshot,
} from "../value-objects/SimulationStateSnapshot.js";

/**
 * Liga cada fonte a sua regra de classificação — mesma tabela (e a mesma
 * limitação: só existe hoje para as três regras registradas em
 * `classification`) já usada em `FatorSourceMapper` (explainability, ADR
 * 0020). Duplicada aqui deliberadamente — `simulation` não deveria
 * depender de `explainability` (módulo-etapa irmão) só por uma tabela de 3
 * linhas. Ver ADR 0023.
 */
const NOME_FATOR_POR_FONTE: Record<string, string> = {
  PGFN: "Pendência Fiscal (PGFN)",
  DATAJUD: "Processo Judicial (DataJud)",
  RECEITA_FEDERAL: "Situação Cadastral (Receita Federal)",
};

const NOME_FONTE_LEGIVEL: Record<string, string> = {
  PGFN: "PGFN",
  DATAJUD: "DataJud",
  RECEITA_FEDERAL: "Receita Federal",
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
  CENPROT: "CENPROT",
};

function encontrarFator(fatores: FatorSnapshot[], nome: string): FatorSnapshot | undefined {
  return fatores.find((fator) => fator.nome === nome);
}

/**
 * Explica, de forma determinística (sem IA), por que cada mudança
 * hipotética aplicada gerou (ou não) impacto — comparando o fator de
 * classificação associado à fonte alterada antes e depois. Ver ADR 0023.
 */
export class SimulationImpactAnalyzer {
  static analyze(
    changes: SimulationChange[],
    antes: SimulationStateSnapshot,
    depois: SimulationStateSnapshot,
  ): SimulationImpactEntry[] {
    const classificacaoMudou = antes.classificacao !== depois.classificacao;
    const confiancaMudou = antes.confidenceScore !== depois.confidenceScore;
    const recomendacaoMudou = antes.recomendacoes[0]?.canal !== depois.recomendacoes[0]?.canal;

    return changes.map((change) => {
      if (change.tipo === "EVIDENCIA") {
        return this.analisarEvidencia(
          change,
          antes,
          depois,
          classificacaoMudou,
          confiancaMudou,
          recomendacaoMudou,
        );
      }
      if (change.tipo === "CONFIANCA_OVERRIDE") {
        return {
          change,
          descricao: `Confiança sobrescrita manualmente de ${antes.confidenceScore.toFixed(2)} para ${change.valor.toFixed(2)}, sem alterar nenhuma evidência real — diverge do que as fontes efetivamente respondidas sustentam.`,
          afetouRisco: false,
          afetouClassificacao: false,
          afetouConfianca: true,
          afetouRecomendacao: recomendacaoMudou,
        };
      }
      return {
        change,
        descricao: `Classificação sobrescrita manualmente de ${antes.classificacao} para ${change.valor}, ignorando o motor de regras — a recomendação foi recalculada a partir do valor forçado, não do score real.`,
        afetouRisco: false,
        afetouClassificacao: true,
        afetouConfianca: false,
        afetouRecomendacao: recomendacaoMudou,
      };
    });
  }

  private static analisarEvidencia(
    change: Extract<SimulationChange, { tipo: "EVIDENCIA" }>,
    antes: SimulationStateSnapshot,
    depois: SimulationStateSnapshot,
    classificacaoMudou: boolean,
    confiancaMudou: boolean,
    recomendacaoMudou: boolean,
  ): SimulationImpactEntry {
    const nomeFonte = NOME_FONTE_LEGIVEL[change.fonte] ?? change.fonte;
    const nomeRegra = NOME_FATOR_POR_FONTE[change.fonte];

    if (!nomeRegra) {
      return {
        change,
        descricao: `A mudança na evidência de ${nomeFonte} não tem nenhuma regra de classificação associada hoje — não influencia o score de risco.`,
        afetouRisco: false,
        afetouClassificacao: false,
        afetouConfianca: confiancaMudou,
        afetouRecomendacao: recomendacaoMudou,
      };
    }

    const fatorAntes = encontrarFator(antes.fatores, nomeRegra);
    const fatorDepois = encontrarFator(depois.fatores, nomeRegra);
    const afetouRisco =
      fatorAntes?.peso !== fatorDepois?.peso || fatorAntes?.direcao !== fatorDepois?.direcao;

    let descricao: string;
    if (!fatorAntes && fatorDepois) {
      descricao = `A evidência de ${nomeFonte} passou a existir, ativando a regra "${fatorDepois.nome}" (${fatorDepois.direcao}, peso ${fatorDepois.peso.toFixed(2)}).`;
    } else if (fatorAntes && !fatorDepois) {
      descricao = `A evidência de ${nomeFonte} deixou de existir, desativando a regra "${fatorAntes.nome}" e removendo seu peso ${fatorAntes.peso.toFixed(2)} do cálculo de risco.`;
    } else if (fatorAntes && fatorDepois && afetouRisco) {
      descricao = `A regra "${fatorAntes.nome}" mudou de ${fatorAntes.direcao} para ${fatorDepois.direcao} após a alteração na evidência de ${nomeFonte}.`;
    } else {
      descricao = `A alteração na evidência de ${nomeFonte} não mudou o resultado da regra "${nomeRegra}".`;
    }

    return {
      change,
      descricao,
      afetouRisco,
      afetouClassificacao: classificacaoMudou,
      afetouConfianca: confiancaMudou,
      afetouRecomendacao: recomendacaoMudou,
    };
  }
}
