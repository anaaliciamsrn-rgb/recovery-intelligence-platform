import { PromptBuilder } from "../../../src/modules/prompt-builder/domain/services/PromptBuilder.js";
import type { PromptContext } from "../../../src/modules/prompt-builder/domain/models/PromptContext.js";

function buildContext(overrides: Partial<PromptContext> = {}): PromptContext {
  return {
    dossieId: "d1",
    geradoEm: "2026-01-01T00:00:00.000Z",
    subject: { tipo: "PESSOA", id: "p1", documento: "52998224725", nome: "Ana Alícia" },
    classificacao: {
      classe: "ALTO_RISCO",
      score: 1,
      confianca: 0.6,
      nivelConfianca: "MEDIA",
      justificativaGeral:
        "Pendência Fiscal (PGFN) (peso 0.40, aumenta risco): PGFN reporta pendência",
      fatores: [
        {
          nome: "Pendência Fiscal (PGFN)",
          peso: 0.4,
          direcao: "AUMENTA_RISCO",
          justificativa: "PGFN reporta pendência",
        },
      ],
    },
    recomendacoes: [
      { canal: "COBRANCA_JURIDICA", justificativa: "Risco alto com confiança suficiente" },
    ],
    ...overrides,
  };
}

describe("PromptBuilder", () => {
  it("toStructuredJson devolve o próprio contexto, sem transformação", () => {
    const context = buildContext();

    expect(PromptBuilder.toStructuredJson(context)).toEqual(context);
  });

  it("toTextPrompt inclui sujeito, classificação, fatores e recomendações", () => {
    const context = buildContext();

    const texto = PromptBuilder.toTextPrompt(context);

    expect(texto).toContain("Ana Alícia");
    expect(texto).toContain("52998224725");
    expect(texto).toContain("ALTO_RISCO");
    expect(texto).toContain("Pendência Fiscal (PGFN)");
    expect(texto).toContain("COBRANCA_JURIDICA");
  });

  it("toTextPrompt omite a seção de fatores quando não há nenhum", () => {
    const context = buildContext({
      classificacao: {
        classe: "BAIXO_RISCO",
        score: 0,
        confianca: 0,
        nivelConfianca: "BAIXA",
        justificativaGeral: "Nenhuma regra pôde ser avaliada",
        fatores: [],
      },
    });

    const texto = PromptBuilder.toTextPrompt(context);

    expect(texto).not.toContain("Fatores considerados");
  });

  it("as duas representações vêm da mesma fonte — mudar o contexto muda as duas juntas", () => {
    const contextoA = buildContext({
      subject: { tipo: "PESSOA", id: "p1", documento: "111", nome: "Pessoa A" },
    });
    const contextoB = buildContext({
      subject: { tipo: "PESSOA", id: "p1", documento: "111", nome: "Pessoa B" },
    });

    expect(PromptBuilder.toTextPrompt(contextoA)).toContain("Pessoa A");
    expect(PromptBuilder.toTextPrompt(contextoB)).toContain("Pessoa B");
    expect((PromptBuilder.toStructuredJson(contextoA) as PromptContext).subject.nome).toBe(
      "Pessoa A",
    );
  });
});
