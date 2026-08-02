import type { SimulationChange } from "../value-objects/SimulationChange.js";
import type { SimulationStateSnapshot } from "../value-objects/SimulationStateSnapshot.js";

const NOME_FONTE_LEGIVEL: Record<string, string> = {
  PGFN: "PGFN",
  DATAJUD: "DataJud",
  RECEITA_FEDERAL: "Receita Federal",
  PORTAL_TRANSPARENCIA: "Portal da Transparência",
  CENPROT: "CENPROT",
};

const NOME_CANAL_LEGIVEL: Record<string, string> = {
  WHATSAPP: "WhatsApp automático",
  LIGACAO: "ligação humana",
  COBRANCA_AMIGAVEL: "cobrança amigável",
  PARCELAMENTO: "parcelamento",
  COBRANCA_JURIDICA: "cobrança jurídica",
};

const NOME_CLASSE_LEGIVEL: Record<string, string> = {
  BAIXO_RISCO: "BAIXO",
  MEDIO_RISCO: "MÉDIO",
  ALTO_RISCO: "ALTO",
};

function descreverMudanca(change: SimulationChange): string {
  if (change.tipo === "EVIDENCIA") {
    const fonte = NOME_FONTE_LEGIVEL[change.fonte] ?? change.fonte;
    if (change.acao === "REMOVER")
      return `a pendência da ${fonte} seja resolvida (evidência removida)`;
    return `a evidência da ${fonte} seja atualizada`;
  }
  if (change.tipo === "CONFIANCA_OVERRIDE") {
    return `a confiança seja ajustada para ${change.valor.toFixed(2)}`;
  }
  return `a classificação seja forçada para ${NOME_CLASSE_LEGIVEL[change.valor] ?? change.valor}`;
}

/**
 * Monta o resumo em linguagem natural exigido para `SimulationResult` —
 * geração determinística por template, nunca por um modelo de linguagem
 * (requisito explícito da Etapa 4). Reaproveita só os dados já computados
 * pelo motor (`antes`/`depois`), nunca inventa nenhum número. Ver ADR 0023.
 */
export class SimulationSummaryBuilder {
  static build(
    changes: SimulationChange[],
    antes: SimulationStateSnapshot,
    depois: SimulationStateSnapshot,
  ): string {
    if (changes.length === 0) {
      return "Nenhuma mudança hipotética foi aplicada — o cenário simulado é idêntico ao estado atual do dossiê.";
    }

    const clausulaMudancas = changes.map(descreverMudanca).join(" e ");
    const classeAntes = NOME_CLASSE_LEGIVEL[antes.classificacao] ?? antes.classificacao;
    const classeDepois = NOME_CLASSE_LEGIVEL[depois.classificacao] ?? depois.classificacao;

    let clausulaRisco: string;
    if (antes.classificacao === depois.classificacao) {
      clausulaRisco = `o risco estimado permanece em ${classeAntes}`;
    } else {
      const direcao = depois.riskScore < antes.riskScore ? "cai" : "sobe";
      clausulaRisco = `o risco estimado ${direcao} de ${classeAntes} para ${classeDepois}`;
    }

    const canalAntes = antes.recomendacoes[0]?.canal;
    const canalDepois = depois.recomendacoes[0]?.canal;
    let clausulaRecomendacao = "";
    if (canalAntes && canalDepois) {
      clausulaRecomendacao =
        canalAntes === canalDepois
          ? `, mantendo a recomendação de ${NOME_CANAL_LEGIVEL[canalAntes] ?? canalAntes}`
          : `, permitindo substituir ${NOME_CANAL_LEGIVEL[canalAntes] ?? canalAntes} por ${NOME_CANAL_LEGIVEL[canalDepois] ?? canalDepois}`;
    }

    return `Caso ${clausulaMudancas} e as demais evidências permaneçam iguais, ${clausulaRisco}${clausulaRecomendacao}.`;
  }
}
