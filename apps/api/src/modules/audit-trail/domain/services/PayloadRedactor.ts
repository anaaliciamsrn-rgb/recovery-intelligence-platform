/**
 * Nomes de campo (case-insensitive) que nunca podem chegar a um payload de
 * auditoria em texto puro — mesma disciplina de redaction já aplicada no
 * Pino (ADR 0006). Fechado de propósito: só segredos de credencial/token,
 * nunca PII de negócio (CPF/CNPJ já são gravados em texto puro em `party`
 * hoje, então mascará-los aqui criaria uma falsa sensação de proteção
 * inconsistente com o resto da plataforma — ver ADR 0021).
 */
const CAMPOS_SENSIVEIS = new Set([
  "password",
  "senha",
  "accesstoken",
  "refreshtoken",
  "token",
  "authorization",
  "passwordhash",
  "tokenhash",
  "cookie",
]);

const VALOR_REDIGIDO = "[REDACTED]";

/**
 * Percorre recursivamente um valor JSON-serializável e substitui o valor de
 * qualquer campo sensível por `[REDACTED]`, preservando a estrutura do
 * restante. Puro, sem I/O — usado pelo middleware de auditoria antes de
 * persistir qualquer requisição/resposta capturada. Ver ADR 0021.
 */
export class PayloadRedactor {
  static redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => PayloadRedactor.redact(item));
    }

    if (value !== null && typeof value === "object") {
      const entradas = Object.entries(value as Record<string, unknown>).map(
        ([chave, valorOriginal]) => {
          if (CAMPOS_SENSIVEIS.has(chave.toLowerCase())) {
            return [chave, VALOR_REDIGIDO] as const;
          }
          return [chave, PayloadRedactor.redact(valorOriginal)] as const;
        },
      );
      return Object.fromEntries(entradas);
    }

    return value;
  }
}
