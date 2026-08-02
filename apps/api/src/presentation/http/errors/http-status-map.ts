import type { AppErrorKind } from "../../../application/errors/AppError.js";

const STATUS_BY_KIND: Record<AppErrorKind, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

export function mapAppErrorKindToStatusCode(kind: AppErrorKind): number {
  return STATUS_BY_KIND[kind];
}
