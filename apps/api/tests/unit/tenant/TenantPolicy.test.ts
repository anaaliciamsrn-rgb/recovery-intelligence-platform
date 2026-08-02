import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { TenantPolicy } from "../../../src/modules/tenant/domain/services/TenantPolicy.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("TenantPolicy", () => {
  it("permite acesso quando o ownership pertence ao tenant informado", () => {
    const ownership = TenantResourceOwnership.create({
      id: "o1",
      tenantId: "tenant-a",
      resourceType: "Empresa",
      resourceId: "empresa-1",
      createdAt: NOW,
    });

    expect(TenantPolicy.podeAcessar(ownership, "tenant-a")).toBe(true);
  });

  it("nega acesso quando o ownership pertence a outro tenant — Empresa A nunca acessa Empresa B", () => {
    const ownership = TenantResourceOwnership.create({
      id: "o1",
      tenantId: "tenant-a",
      resourceType: "Empresa",
      resourceId: "empresa-1",
      createdAt: NOW,
    });

    expect(TenantPolicy.podeAcessar(ownership, "tenant-b")).toBe(false);
  });

  it("nega acesso (fail-closed) quando não há nenhum ownership registrado", () => {
    expect(TenantPolicy.podeAcessar(null, "tenant-a")).toBe(false);
  });
});
