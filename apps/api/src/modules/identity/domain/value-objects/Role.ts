/**
 * Enum fechado, definido em código — sem tabela própria nesta fase (papéis
 * não são gerenciáveis dinamicamente ainda; ver docs/architecture/decisions/0010).
 * `MANAGER`/`COLLECTOR`/`AUDITOR` foram adicionados na Etapa 10 (RBAC
 * Enterprise, ADR 0029) — extensão aditiva, nenhum dos três papéis
 * originais teve seu conjunto de permissões alterado.
 */
export type Role = "ADMIN" | "ANALYST" | "VIEWER" | "MANAGER" | "COLLECTOR" | "AUDITOR";

export const Role = {
  ADMIN: "ADMIN",
  ANALYST: "ANALYST",
  VIEWER: "VIEWER",
  MANAGER: "MANAGER",
  COLLECTOR: "COLLECTOR",
  AUDITOR: "AUDITOR",
} as const satisfies Record<string, Role>;
