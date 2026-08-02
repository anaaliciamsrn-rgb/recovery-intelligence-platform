function normalizeTokens(nome: string): Set<string> {
  return new Set(
    nome
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .filter((token) => token.length > 0),
  );
}

/**
 * Similaridade por sobreposição de tokens (Jaccard) — deliberadamente
 * simples, sem fonética nem distância de edição. "Não sofisticado" de
 * propósito, mesmo padrão de `ExactDocumentMatchStrategy` (ADR 0013). Usado
 * tanto para filtrar candidatos (`PartyByNameIdentitySourceProvider`) quanto
 * para pontuar o sinal de nome (`PartialDocumentMatchStrategy`). Ver ADR 0019.
 */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = normalizeTokens(a);
  const tokensB = normalizeTokens(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;

  return union > 0 ? intersection / union : 0;
}
