export type AppErrorKind =
  "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL";

/**
 * Erro de aplicação com significado independente de HTTP (`kind`).
 * O mapeamento `kind -> status code` fica em presentation (ver http-status-map.ts).
 */
export class AppError extends Error {
  constructor(
    public readonly kind: AppErrorKind,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
