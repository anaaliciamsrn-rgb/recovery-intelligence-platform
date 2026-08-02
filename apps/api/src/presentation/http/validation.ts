import type { ZodSchema } from "zod";
import { AppError } from "../../application/errors/AppError.js";

/**
 * Traduz falha de validação Zod em `AppError("VALIDATION", ...)` — sem isso,
 * um `schema.parse()` que falha lança `ZodError`, que o error handler
 * central trataria como 500 (inesperado) em vez de 400 (entrada inválida).
 * Utilitário do shared kernel: qualquer módulo com corpo de requisição vai
 * precisar disso, não só identity.
 */
export function parseRequestBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new AppError("VALIDATION", "Corpo da requisição inválido", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
}
