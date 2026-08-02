const DEFAULT_TTL_SECONDS = 60;

/**
 * TTL "inteligente" por namespace — cada tipo de dado cacheado tem um custo
 * de staleness diferente, então não faz sentido um único TTL global.
 * `analytics` agrega a plataforma inteira (ADR 0025) e muda pouco minuto a
 * minuto — TTL mais longo. `confidence-heatmap`/`dossie` refletem o estado
 * de um caso específico, que pode mudar a qualquer evidência nova — TTL
 * mais curto. Um `override` explícito por chamada sempre vence o padrão do
 * namespace. Ver ADR 0033.
 */
const TTL_SECONDS_BY_NAMESPACE: Record<string, number> = {
  analytics: 120,
  "confidence-heatmap": 30,
  dossie: 30,
};

export class CacheTtlPolicy {
  static resolverTtlSegundos(namespace: string, overrideSegundos?: number | null): number {
    if (overrideSegundos !== undefined && overrideSegundos !== null && overrideSegundos > 0) {
      return overrideSegundos;
    }
    return TTL_SECONDS_BY_NAMESPACE[namespace] ?? DEFAULT_TTL_SECONDS;
  }
}
