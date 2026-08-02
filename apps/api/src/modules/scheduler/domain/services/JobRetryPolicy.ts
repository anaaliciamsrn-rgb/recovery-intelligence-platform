const BASE_DELAY_SECONDS = 30;
const MAX_DELAY_SECONDS = 3600;

/**
 * Backoff exponencial (30s, 60s, 120s, ... até um teto de 1h) — puro, sem
 * I/O. `tentativas` é o número de tentativas já feitas *antes* desta falha
 * (a falha atual ainda não foi contabilizada pelo chamador). Ver ADR 0032.
 */
export class JobRetryPolicy {
  static calcularProximaTentativa(
    tentativas: number,
    maxTentativas: number,
    now: Date,
  ): Date | null {
    const tentativasAposEstaFalha = tentativas + 1;
    if (tentativasAposEstaFalha >= maxTentativas) {
      return null;
    }

    const delaySeconds = Math.min(BASE_DELAY_SECONDS * 2 ** tentativas, MAX_DELAY_SECONDS);
    return new Date(now.getTime() + delaySeconds * 1000);
  }
}
