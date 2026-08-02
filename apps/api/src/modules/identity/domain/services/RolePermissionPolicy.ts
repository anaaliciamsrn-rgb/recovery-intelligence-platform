import { Permission } from "../value-objects/Permission.js";
import { Role } from "../value-objects/Role.js";

/**
 * Domain service: resolução de papel -> permissões não pertence a nenhuma
 * entidade específica (lógica cross-cutting dentro do domínio). Puro, sem
 * I/O — pode ser chamado a cada requisição autenticada sem custo.
 */
/**
 * `MANAGER`/`COLLECTOR`/`AUDITOR` e as permissões `case:*`/`workflow:*`/
 * `tenant:*`/`analytics:*`/`confidence-heatmap:*` foram adicionados na
 * Etapa 10 (RBAC Enterprise, ADR 0029). `rule:*` foi adicionada na Etapa 11
 * (Rule Builder, ADR 0030), `feature-flag:*` na Etapa 12 (Feature Flags,
 * ADR 0031), `scheduler:*` na Etapa 13 (Scheduler, ADR 0032) e `cache:*` na
 * Etapa 14 (Cache Layer, ADR 0033), seguindo o mesmo mapeamento por papel.
 * `VIEWER` permanece deliberadamente com zero permissões — comportamento
 * pinado por teste existente (`RolePermissionPolicy.test.ts`, "VIEWER não
 * tem nenhuma permissão"), que não pode ser alterado. Ver ADR 0029 para a
 * limitação que isso implica.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.MANAGE_SESSIONS,
    Permission.REVOKE_ANY_SESSION,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_USERS,
    Permission.CASE_READ,
    Permission.CASE_WRITE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_WRITE,
    Permission.TENANT_MANAGE,
    Permission.ANALYTICS_READ,
    Permission.CONFIDENCE_HEATMAP_READ,
    Permission.RULE_READ,
    Permission.RULE_WRITE,
    Permission.FEATURE_FLAG_READ,
    Permission.FEATURE_FLAG_WRITE,
    Permission.SCHEDULER_READ,
    Permission.SCHEDULER_WRITE,
    Permission.CACHE_READ,
    Permission.CACHE_WRITE,
  ],
  [Role.ANALYST]: [Permission.MANAGE_SESSIONS],
  [Role.VIEWER]: [],
  [Role.MANAGER]: [
    Permission.CASE_READ,
    Permission.CASE_WRITE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_WRITE,
    Permission.TENANT_MANAGE,
    Permission.ANALYTICS_READ,
    Permission.CONFIDENCE_HEATMAP_READ,
    Permission.RULE_READ,
    Permission.RULE_WRITE,
    Permission.FEATURE_FLAG_READ,
    Permission.FEATURE_FLAG_WRITE,
    Permission.SCHEDULER_READ,
    Permission.SCHEDULER_WRITE,
    Permission.CACHE_READ,
    Permission.CACHE_WRITE,
  ],
  [Role.COLLECTOR]: [
    Permission.CASE_READ,
    Permission.CASE_WRITE,
    Permission.WORKFLOW_READ,
    Permission.CONFIDENCE_HEATMAP_READ,
    Permission.RULE_READ,
  ],
  [Role.AUDITOR]: [
    Permission.VIEW_AUDIT_LOG,
    Permission.CASE_READ,
    Permission.WORKFLOW_READ,
    Permission.ANALYTICS_READ,
    Permission.CONFIDENCE_HEATMAP_READ,
    Permission.RULE_READ,
    Permission.FEATURE_FLAG_READ,
    Permission.SCHEDULER_READ,
    Permission.CACHE_READ,
  ],
};

export const RolePermissionPolicy = {
  resolvePermissions(roles: readonly Role[]): Set<Permission> {
    const permissions = new Set<Permission>();

    for (const role of roles) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        permissions.add(permission);
      }
    }

    return permissions;
  },

  hasPermission(roles: readonly Role[], permission: Permission): boolean {
    return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
  },
};
