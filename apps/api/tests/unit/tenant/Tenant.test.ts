import { InvalidTenantError, Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("Tenant", () => {
  it("cria um tenant válido", () => {
    const tenant = Tenant.create({
      id: "t1",
      nome: "Empresa A",
      slug: "empresa-a",
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(tenant.slug).toBe("empresa-a");
  });

  it("rejeita nome vazio", () => {
    expect(() =>
      Tenant.create({
        id: "t1",
        nome: "   ",
        slug: "empresa-a",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow(InvalidTenantError);
  });

  it("rejeita slug com caracteres inválidos", () => {
    expect(() =>
      Tenant.create({
        id: "t1",
        nome: "Empresa A",
        slug: "Empresa A!",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow(InvalidTenantError);
  });
});
