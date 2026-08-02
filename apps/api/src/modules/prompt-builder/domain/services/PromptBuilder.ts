import type { PromptContext } from "../models/PromptContext.js";

/**
 * Serviço de domínio puro — sem I/O. Duas representações da MESMA fonte de
 * verdade (`PromptContext`), nunca divergentes entre si por construção: se
 * um dado muda no contexto, as duas saídas mudam juntas. Destinado a um
 * futuro Agente de IA (ver ADR 0018) — `toStructuredJson` para consumo
 * programático, `toTextPrompt` para uso direto como contexto de LLM.
 */
export class PromptBuilder {
  static toStructuredJson(context: PromptContext): PromptContext {
    return context;
  }

  static toTextPrompt(context: PromptContext): string {
    const linhas: string[] = [];

    linhas.push(
      `Sujeito: ${context.subject.nome} (${context.subject.tipo}, documento ${context.subject.documento})`,
    );
    linhas.push(`Dossiê: ${context.dossieId} (atualizado em ${context.geradoEm})`);
    linhas.push("");
    linhas.push(
      `Classificação de risco: ${context.classificacao.classe} ` +
        `(score ${context.classificacao.score.toFixed(2)}, ` +
        `confiança ${context.classificacao.nivelConfianca.toLowerCase()} [${context.classificacao.confianca.toFixed(2)}])`,
    );
    linhas.push(context.classificacao.justificativaGeral);

    if (context.classificacao.fatores.length > 0) {
      linhas.push("");
      linhas.push("Fatores considerados:");
      for (const fator of context.classificacao.fatores) {
        linhas.push(
          `- ${fator.nome} (peso ${fator.peso.toFixed(2)}, ${fator.direcao}): ${fator.justificativa}`,
        );
      }
    }

    linhas.push("");
    linhas.push("Recomendações de cobrança:");
    for (const recomendacao of context.recomendacoes) {
      linhas.push(`- ${recomendacao.canal}: ${recomendacao.justificativa}`);
    }

    return linhas.join("\n");
  }
}
