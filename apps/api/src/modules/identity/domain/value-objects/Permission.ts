/**
 * Checagens de autorização usam sempre permissão, nunca nome de papel
 * diretamente — código que autoriza não deveria saber "ADMIN existe", só
 * "esta ação exige X" (Interface Segregation aplicada a autorização).
 *
 * As permissões `case:*`/`workflow:*`/`tenant:*`/`analytics:*`/
 * `confidence-heatmap:*` foram adicionadas na Etapa 10 (RBAC Enterprise,
 * ADR 0029) — extensão aditiva para os módulos das Etapas 5–9. `rule:*` foi
 * adicionada na Etapa 11 (Rule Builder, ADR 0030), `feature-flag:*` na
 * Etapa 12 (Feature Flags, ADR 0031), `scheduler:*` na Etapa 13 (Scheduler,
 * ADR 0032) e `cache:*` na Etapa 14 (Cache Layer, ADR 0033), mesmo padrão.
 * Nenhuma permissão de identity existente foi alterada.
 */
export type Permission =
  | "identity:manage-sessions"
  | "identity:revoke-any-session"
  | "identity:view-audit-log"
  | "identity:manage-users"
  | "case:read"
  | "case:write"
  | "workflow:read"
  | "workflow:write"
  | "tenant:manage"
  | "analytics:read"
  | "confidence-heatmap:read"
  | "rule:read"
  | "rule:write"
  | "feature-flag:read"
  | "feature-flag:write"
  | "scheduler:read"
  | "scheduler:write"
  | "cache:read"
  | "cache:write";

export const Permission = {
  MANAGE_SESSIONS: "identity:manage-sessions",
  REVOKE_ANY_SESSION: "identity:revoke-any-session",
  VIEW_AUDIT_LOG: "identity:view-audit-log",
  MANAGE_USERS: "identity:manage-users",
  CASE_READ: "case:read",
  CASE_WRITE: "case:write",
  WORKFLOW_READ: "workflow:read",
  WORKFLOW_WRITE: "workflow:write",
  TENANT_MANAGE: "tenant:manage",
  ANALYTICS_READ: "analytics:read",
  CONFIDENCE_HEATMAP_READ: "confidence-heatmap:read",
  RULE_READ: "rule:read",
  RULE_WRITE: "rule:write",
  FEATURE_FLAG_READ: "feature-flag:read",
  FEATURE_FLAG_WRITE: "feature-flag:write",
  SCHEDULER_READ: "scheduler:read",
  SCHEDULER_WRITE: "scheduler:write",
  CACHE_READ: "cache:read",
  CACHE_WRITE: "cache:write",
} as const satisfies Record<string, Permission>;
