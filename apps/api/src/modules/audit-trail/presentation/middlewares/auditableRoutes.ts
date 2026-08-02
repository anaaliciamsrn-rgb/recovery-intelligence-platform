import type { Request } from "express";
import { PayloadRedactor } from "../../domain/services/PayloadRedactor.js";
import type { AuditEventType } from "../../domain/value-objects/AuditEventType.js";

export interface AuditableRouteContext {
  req: Request;
  responseBody: unknown;
}

export interface AuditableRouteConfig {
  method: string;
  /** `req.baseUrl + req.route.path`, já normalizado (ver `normalizePattern`). */
  pattern: string;
  tipo: AuditEventType;
  entidade: string;
  extractEntidadeId(ctx: AuditableRouteContext): string | null;
  extractUsuarioId(ctx: AuditableRouteContext): string | null;
  extractPayload(ctx: AuditableRouteContext): unknown;
}

function defaultExtractUsuarioId(ctx: AuditableRouteContext): string | null {
  return ctx.req.auth?.userId ?? null;
}

function defaultExtractPayload(ctx: AuditableRouteContext): unknown {
  return {
    request: PayloadRedactor.redact(ctx.req.body),
    response: PayloadRedactor.redact(ctx.responseBody),
  };
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

interface UploadedFileForAudit {
  originalname: string;
  size: number;
}

/**
 * As treze rotas HTTP consideradas relevantes para auditoria (mesma lista
 * da `AuditEventType`). Cada entrada só sabe interpretar a sua própria
 * requisição/resposta — nada aqui infere um campo que a rota não devolve
 * de fato (ex.: `logout` não expõe o usuário no corpo da resposta, então
 * `extractUsuarioId` devolve `null` em vez de adivinhar — ver ADR 0021).
 */
export const AUDITABLE_ROUTES: AuditableRouteConfig[] = [
  {
    method: "POST",
    pattern: "/api/v1/auth/login",
    tipo: "LOGIN",
    entidade: "User",
    extractEntidadeId: (ctx) =>
      stringOrNull(responseBodyField(responseBodyField(ctx.responseBody, "user"), "id")),
    extractUsuarioId: (ctx) =>
      stringOrNull(responseBodyField(responseBodyField(ctx.responseBody, "user"), "id")),
    extractPayload: (ctx) => ({
      request: PayloadRedactor.redact({ email: (ctx.req.body as { email?: unknown })?.email }),
      response: PayloadRedactor.redact(ctx.responseBody),
    }),
  },
  {
    method: "POST",
    pattern: "/api/v1/auth/logout",
    tipo: "LOGOUT",
    entidade: "Session",
    // O logout usa só o cookie de refresh token (nunca o Bearer) — o
    // controller não expõe o usuário nem no corpo da resposta (204 sem
    // corpo) nem via `req.auth`. Ficar `null` aqui é honesto: o log de
    // segurança interno de `identity` (AuditLogEntry, evento "LOGOUT")
    // continua sendo a fonte correta para "qual usuário" nesse caso — ver
    // ADR 0021.
    extractEntidadeId: () => null,
    extractUsuarioId: () => null,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/pessoas",
    tipo: "PESSOA_CRIADA",
    entidade: "Pessoa",
    extractEntidadeId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "id")),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/empresas",
    tipo: "EMPRESA_CRIADA",
    entidade: "Empresa",
    extractEntidadeId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "id")),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/participacoes-societarias",
    tipo: "PARTICIPACAO_SOCIETARIA_CRIADA",
    entidade: "ParticipacaoSocietaria",
    extractEntidadeId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "id")),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/imports",
    tipo: "PLANILHA_IMPORTADA",
    entidade: "ImportBatch",
    extractEntidadeId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "importBatchId")),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: (ctx) => {
      const file = (ctx.req as Request & { file?: UploadedFileForAudit }).file;
      return {
        request: file ? { nomeArquivo: file.originalname, tamanhoBytes: file.size } : null,
        response: PayloadRedactor.redact(ctx.responseBody),
      };
    },
  },
  {
    method: "POST",
    pattern: "/api/v1/dossies",
    tipo: "DOSSIE_CRIADO",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(responseBodyField(ctx.responseBody, "id")),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/dossies/:id/evidencias",
    tipo: "EVIDENCIA_ATUALIZADA",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(ctx.req.params.id),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "POST",
    pattern: "/api/v1/identity-resolution/resolve",
    tipo: "IDENTITY_RESOLUTION_EXECUTADA",
    entidade: "IdentityResolution",
    // Consulta, não persiste nenhuma entidade própria — não há id para apontar.
    extractEntidadeId: () => null,
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "GET",
    pattern: "/api/v1/classificacoes/:dossieId",
    tipo: "CLASSIFICACAO_EXECUTADA",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(ctx.req.params.dossieId),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "GET",
    pattern: "/api/v1/recomendacoes/:dossieId",
    tipo: "RECOMENDACAO_GERADA",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(ctx.req.params.dossieId),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "GET",
    pattern: "/api/v1/prompts/:dossieId",
    tipo: "PROMPT_GERADO",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(ctx.req.params.dossieId),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
  {
    method: "GET",
    pattern: "/api/v1/classification/:id/explanation",
    tipo: "EXPLICACAO_CONSULTADA",
    entidade: "Dossie",
    extractEntidadeId: (ctx) => stringOrNull(ctx.req.params.id),
    extractUsuarioId: defaultExtractUsuarioId,
    extractPayload: defaultExtractPayload,
  },
];

/** Remove a barra final (exceto na raiz "/") para casar `req.baseUrl + req.route.path` com o padrão da tabela. */
export function normalizePattern(pattern: string): string {
  return pattern.length > 1 && pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
}

export function findAuditableRoute(
  method: string,
  fullPath: string,
): AuditableRouteConfig | undefined {
  const normalized = normalizePattern(fullPath);
  return AUDITABLE_ROUTES.find((route) => route.method === method && route.pattern === normalized);
}
