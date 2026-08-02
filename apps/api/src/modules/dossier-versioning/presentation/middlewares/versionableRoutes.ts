import type { Request } from "express";

export interface VersionableRouteContext {
  req: Request;
  responseBody: unknown;
}

export interface VersionableRouteConfig {
  method: string;
  /** `req.baseUrl + req.route.path`, já normalizado (ver `normalizePattern`). */
  pattern: string;
  extractDossieId(ctx: VersionableRouteContext): string | null;
}

function responseBodyField(responseBody: unknown, field: string): unknown {
  if (responseBody !== null && typeof responseBody === "object" && field in responseBody) {
    return (responseBody as Record<string, unknown>)[field];
  }
  return undefined;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * As duas rotas cuja resposta bem-sucedida deve gerar uma nova versão do
 * Dossiê: criação (a versão 1, a linha de base vazia) e atualização de
 * evidência (cada uma gera a versão seguinte). Ver ADR 0022.
 */
export const VERSIONABLE_ROUTES: VersionableRouteConfig[] = [
  {
    method: "POST",
    pattern: "/api/v1/dossies",
    extractDossieId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "id")),
  },
  {
    method: "POST",
    pattern: "/api/v1/dossies/:id/evidencias",
    extractDossieId: (ctx) => stringOrNull(ctx.req.params.id),
  },
];

/** Remove a barra final (exceto na raiz "/") para casar `req.baseUrl + req.route.path` com o padrão da tabela. */
export function normalizePattern(pattern: string): string {
  return pattern.length > 1 && pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
}

export function findVersionableRoute(
  method: string,
  fullPath: string,
): VersionableRouteConfig | undefined {
  const normalized = normalizePattern(fullPath);
  return VERSIONABLE_ROUTES.find(
    (route) => route.method === method && route.pattern === normalized,
  );
}
