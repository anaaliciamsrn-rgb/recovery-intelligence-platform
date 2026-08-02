import { RolePermissionPolicy } from "../../../src/modules/identity/domain/services/RolePermissionPolicy.js";
import { Permission } from "../../../src/modules/identity/domain/value-objects/Permission.js";
import { Role } from "../../../src/modules/identity/domain/value-objects/Role.js";

describe("RolePermissionPolicy", () => {
  it("VIEWER não tem nenhuma permissão", () => {
    expect(RolePermissionPolicy.resolvePermissions([Role.VIEWER]).size).toBe(0);
  });

  it("ANALYST pode gerenciar as próprias sessões, mas não as de outros", () => {
    expect(RolePermissionPolicy.hasPermission([Role.ANALYST], Permission.MANAGE_SESSIONS)).toBe(
      true,
    );
    expect(RolePermissionPolicy.hasPermission([Role.ANALYST], Permission.REVOKE_ANY_SESSION)).toBe(
      false,
    );
  });

  it("ADMIN acumula todas as permissões", () => {
    const permissions = RolePermissionPolicy.resolvePermissions([Role.ADMIN]);
    expect(permissions.has(Permission.MANAGE_SESSIONS)).toBe(true);
    expect(permissions.has(Permission.REVOKE_ANY_SESSION)).toBe(true);
    expect(permissions.has(Permission.VIEW_AUDIT_LOG)).toBe(true);
  });

  it("resolve a união de permissões quando o usuário tem múltiplos papéis", () => {
    const hasPermission = RolePermissionPolicy.hasPermission(
      [Role.VIEWER, Role.ANALYST],
      Permission.MANAGE_SESSIONS,
    );
    expect(hasPermission).toBe(true);
  });
});
