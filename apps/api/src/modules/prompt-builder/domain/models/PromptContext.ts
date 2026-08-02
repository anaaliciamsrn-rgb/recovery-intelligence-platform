export interface PromptFator {
  nome: string;
  peso: number;
  direcao: string;
  justificativa: string;
}

export interface PromptRecomendacao {
  canal: string;
  justificativa: string;
}

/**
 * Snapshot de todos os dados relevantes sobre um Dossiê, já achatados num
 * formato plano — a única estrutura que `PromptBuilder` sabe renderizar.
 * Nunca é persistida; é montada do zero a cada chamada de
 * `BuildPromptUseCase` (ver ADR 0018). Datas já como string ISO — este tipo
 * é o "de saída", pronto para JSON, não um agregado de domínio com Date
 * objects.
 */
export interface PromptContext {
  dossieId: string;
  geradoEm: string;
  subject: {
    tipo: string;
    id: string;
    documento: string;
    nome: string;
  };
  classificacao: {
    classe: string;
    score: number;
    confianca: number;
    nivelConfianca: string;
    justificativaGeral: string;
    fatores: PromptFator[];
  };
  recomendacoes: PromptRecomendacao[];
}
