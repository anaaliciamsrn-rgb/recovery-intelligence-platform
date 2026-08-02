/**
 * `old`/`new`/`difference` para um único aspecto do dossiê (score,
 * classificação, confiança, recomendações, prompt) — a forma pedida
 * explicitamente para `SimulationComparison`. `T` é o tipo do próprio
 * valor; `difference` é deliberadamente `unknown` porque seu formato varia
 * por aspecto (número para score/confiança, lista de canais para
 * recomendações, booleano para prompt). Ver ADR 0023.
 */
export interface SimulationComparison<T> {
  old: T;
  new: T;
  difference: unknown;
}
