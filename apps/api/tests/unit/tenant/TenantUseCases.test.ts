import { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import { CheckTenantAccessUseCase } from "../../../src/modules/tenant/application/use-cases/CheckTenantAccessUseCase.js";
import { CreateTenantUseCase } from "../../../src/modules/tenant/application/use-cases/CreateTenantUseCase.js";
import { GetTenantUseCase } from "../../../src/modules/tenant/application/use-cases/GetTenantUseCase.js";
import { RegisterTenantResourceUseCase } from "../../../src/modules/tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeTenantRepository,
  FakeTenantResourceOwnershipRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("CreateTenantUseCase", () => {
  it("cria um tenant novo", async () => {
    const tenantRepository = new FakeTenantRepository();
    const useCase = new CreateTenantUseCase(
      tenantRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const tenant = await useCase.execute({ nome: "Empresa A", slug: "empresa-a" });

    expect(await tenantRepository.findBySlug("empresa-a")).not.toBeNull();
    expect(tenant.nome).toBe("Empresa A");
  });

  it("lança CONFLICT quando o slug já existe", async () => {
    const tenantRepository = new FakeTenantRepository();
    tenantRepository.seed(
      Tenant.create({
        id: "t1",
        nome: "Empresa A",
        slug: "empresa-a",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const useCase = new CreateTenantUseCase(
      tenantRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(useCase.execute({ nome: "Outra", slug: "empresa-a" })).rejects.toMatchObject({
      kind: "CONFLICT",
    });
  });

  it("lança VALIDATION para slug inválido", async () => {
    const useCase = new CreateTenantUseCase(
      new FakeTenantRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({ nome: "Empresa A", slug: "Slug Inválido!" }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("GetTenantUseCase", () => {
  it("lança NOT_FOUND quando o tenant não existe", async () => {
    const useCase = new GetTenantUseCase(new FakeTenantRepository());

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("RegisterTenantResourceUseCase + CheckTenantAccessUseCase", () => {
  it("registra um recurso e permite acesso só ao tenant proprietário", async () => {
    const tenantRepository = new FakeTenantRepository();
    const tenantA = Tenant.create({
      id: "tenant-a",
      nome: "Empresa A",
      slug: "empresa-a",
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const tenantB = Tenant.create({
      id: "tenant-b",
      nome: "Empresa B",
      slug: "empresa-b",
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    tenantRepository.seed(tenantA);
    tenantRepository.seed(tenantB);

    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
    const registerUseCase = new RegisterTenantResourceUseCase(
      tenantRepository,
      ownershipRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    await registerUseCase.execute({
      tenantId: "tenant-a",
      resourceType: "Empresa",
      resourceId: "empresa-1",
    });

    const checkUseCase = new CheckTenantAccessUseCase(ownershipRepository);
    expect(
      await checkUseCase.execute({
        tenantId: "tenant-a",
        resourceType: "Empresa",
        resourceId: "empresa-1",
      }),
    ).toBe(true);
    expect(
      await checkUseCase.execute({
        tenantId: "tenant-b",
        resourceType: "Empresa",
        resourceId: "empresa-1",
      }),
    ).toBe(false);
  });

  it("lança CONFLICT ao tentar registrar um recurso já pertencente a outro tenant", async () => {
    const tenantRepository = new FakeTenantRepository();
    tenantRepository.seed(
      Tenant.create({
        id: "tenant-a",
        nome: "Empresa A",
        slug: "empresa-a",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    tenantRepository.seed(
      Tenant.create({
        id: "tenant-b",
        nome: "Empresa B",
        slug: "empresa-b",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
    const useCase = new RegisterTenantResourceUseCase(
      tenantRepository,
      ownershipRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    await useCase.execute({
      tenantId: "tenant-a",
      resourceType: "Empresa",
      resourceId: "empresa-1",
    });

    await expect(
      useCase.execute({ tenantId: "tenant-b", resourceType: "Empresa", resourceId: "empresa-1" }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });
  });

  it("é idempotente ao registrar novamente o mesmo recurso para o mesmo tenant", async () => {
    const tenantRepository = new FakeTenantRepository();
    tenantRepository.seed(
      Tenant.create({
        id: "tenant-a",
        nome: "Empresa A",
        slug: "empresa-a",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
    const useCase = new RegisterTenantResourceUseCase(
      tenantRepository,
      ownershipRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await useCase.execute({
      tenantId: "tenant-a",
      resourceType: "Empresa",
      resourceId: "empresa-1",
    });
    await expect(
      useCase.execute({ tenantId: "tenant-a", resourceType: "Empresa", resourceId: "empresa-1" }),
    ).resolves.toBeDefined();
  });

  it("lança VALIDATION quando o tenant não existe", async () => {
    const useCase = new RegisterTenantResourceUseCase(
      new FakeTenantRepository(),
      new FakeTenantResourceOwnershipRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({
        tenantId: "inexistente",
        resourceType: "Empresa",
        resourceId: "empresa-1",
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});
