import { RolePermissionPolicy } from "../../../src/modules/identity/domain/services/RolePermissionPolicy.js";
import { Permission } from "../../../src/modules/identity/domain/value-objects/Permission.js";
import { Role } from "../../../src/modules/identity/domain/value-objects/Role.js";

/**
 * Cobertura dos papéis/permissões adicionados na Etapa 10 (RBAC Enterprise,
 * ADR 0029). Arquivo separado de `RolePermissionPolicy.test.ts` porque aquele
 * arquivo pina o comportamento de `VIEWER` (zero permissões) e não deve ser
 * alterado; aqui documentamos, via teste que passa, que esse pin permanece
 * válido mesmo após a extensão de papéis/permissões.
 */
describe("RolePermissionPolicy — RBAC Enterprise (Etapa 10)", () => {
  it("MANAGER tem acesso de leitura e escrita a case, workflow, analytics, confidence-heatmap e gestão de tenant", () => {
    const permissions = RolePermissionPolicy.resolvePermissions([Role.MANAGER]);
    expect(permissions.has(Permission.CASE_READ)).toBe(true);
    expect(permissions.has(Permission.CASE_WRITE)).toBe(true);
    expect(permissions.has(Permission.WORKFLOW_READ)).toBe(true);
    expect(permissions.has(Permission.WORKFLOW_WRITE)).toBe(true);
    expect(permissions.has(Permission.TENANT_MANAGE)).toBe(true);
    expect(permissions.has(Permission.ANALYTICS_READ)).toBe(true);
    expect(permissions.has(Permission.CONFIDENCE_HEATMAP_READ)).toBe(true);
  });

  it("COLLECTOR pode ler e escrever cases, mas só ler workflow e não gerencia tenant", () => {
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.CASE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.CASE_WRITE)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.WORKFLOW_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.WORKFLOW_WRITE)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.TENANT_MANAGE)).toBe(
      false,
    );
  });

  it("AUDITOR tem acesso de leitura amplo e ao log de auditoria, mas nunca escreve", () => {
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.VIEW_AUDIT_LOG)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.CASE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.WORKFLOW_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.ANALYTICS_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.CASE_WRITE)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.WORKFLOW_WRITE)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.TENANT_MANAGE)).toBe(
      false,
    );
  });

  it("ADMIN acumula também as novas permissões granulares", () => {
    const permissions = RolePermissionPolicy.resolvePermissions([Role.ADMIN]);
    expect(permissions.has(Permission.CASE_WRITE)).toBe(true);
    expect(permissions.has(Permission.WORKFLOW_WRITE)).toBe(true);
    expect(permissions.has(Permission.TENANT_MANAGE)).toBe(true);
    expect(permissions.has(Permission.ANALYTICS_READ)).toBe(true);
    expect(permissions.has(Permission.CONFIDENCE_HEATMAP_READ)).toBe(true);
  });

  it("VIEWER permanece sem nenhuma permissão nova (limitação conhecida, ver ADR 0029)", () => {
    const permissions = RolePermissionPolicy.resolvePermissions([Role.VIEWER]);
    expect(permissions.size).toBe(0);
    expect(permissions.has(Permission.CASE_READ)).toBe(false);
    expect(permissions.has(Permission.CONFIDENCE_HEATMAP_READ)).toBe(false);
  });

  it("ANALYST não ganhou nenhuma das novas permissões (extensão puramente aditiva)", () => {
    expect(RolePermissionPolicy.hasPermission([Role.ANALYST], Permission.CASE_READ)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.ANALYST], Permission.WORKFLOW_READ)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.ANALYST], Permission.TENANT_MANAGE)).toBe(
      false,
    );
  });

  it("resolve a união de permissões entre um novo papel e um papel pré-existente", () => {
    const permissions = RolePermissionPolicy.resolvePermissions([Role.COLLECTOR, Role.ANALYST]);
    expect(permissions.has(Permission.CASE_READ)).toBe(true);
    expect(permissions.has(Permission.MANAGE_SESSIONS)).toBe(true);
  });

  it("Etapa 11 (Rule Builder, ADR 0030): MANAGER lê e escreve regras, COLLECTOR e AUDITOR só leem, VIEWER continua em zero", () => {
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.RULE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.RULE_WRITE)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.RULE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.RULE_WRITE)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.RULE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.RULE_WRITE)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.VIEWER], Permission.RULE_READ)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.ADMIN], Permission.RULE_WRITE)).toBe(true);
  });

  it("Etapa 12 (Feature Flags, ADR 0031): MANAGER lê e escreve flags, AUDITOR só lê, COLLECTOR e VIEWER não têm nenhuma", () => {
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.FEATURE_FLAG_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.FEATURE_FLAG_WRITE)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.FEATURE_FLAG_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.FEATURE_FLAG_WRITE)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.FEATURE_FLAG_READ)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.VIEWER], Permission.FEATURE_FLAG_READ)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.ADMIN], Permission.FEATURE_FLAG_WRITE)).toBe(
      true,
    );
  });

  it("Etapa 13 (Scheduler, ADR 0032): MANAGER lê e escreve jobs, AUDITOR só lê, COLLECTOR e VIEWER não têm nenhuma", () => {
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.SCHEDULER_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.SCHEDULER_WRITE)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.SCHEDULER_READ)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.SCHEDULER_WRITE)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.SCHEDULER_READ)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.VIEWER], Permission.SCHEDULER_READ)).toBe(
      false,
    );
    expect(RolePermissionPolicy.hasPermission([Role.ADMIN], Permission.SCHEDULER_WRITE)).toBe(true);
  });

  it("Etapa 14 (Cache Layer, ADR 0033): MANAGER lê e escreve cache, AUDITOR só lê, COLLECTOR e VIEWER não têm nenhuma", () => {
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.CACHE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.MANAGER], Permission.CACHE_WRITE)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.CACHE_READ)).toBe(true);
    expect(RolePermissionPolicy.hasPermission([Role.AUDITOR], Permission.CACHE_WRITE)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.COLLECTOR], Permission.CACHE_READ)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.VIEWER], Permission.CACHE_READ)).toBe(false);
    expect(RolePermissionPolicy.hasPermission([Role.ADMIN], Permission.CACHE_WRITE)).toBe(true);
  });
});
