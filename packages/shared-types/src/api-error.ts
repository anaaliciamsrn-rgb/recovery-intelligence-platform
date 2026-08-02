/**
 * Formato padrão de erro retornado por qualquer endpoint da API.
 * Mantido em @rip/shared-types para que o frontend possa tipar
 * respostas de erro sem duplicar a definição.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
