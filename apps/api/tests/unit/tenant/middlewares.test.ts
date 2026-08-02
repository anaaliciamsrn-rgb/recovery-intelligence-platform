import express from "express";
import request from "supertest";
import { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { createRequireTenantAccessMiddleware } from "../../../src/modules/tenant/presentation/middlewares/requireTenantAccess.middleware.js";
import { createResolveTenantMiddleware } from "../../../src/modules/tenant/presentation/middlewares/resolveTenant.middleware.js";
import { FakeTenantRepository, FakeTenantResourceOwnershipRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildApp(
  tenantRepository: FakeTenantRepository,
  ownershipRepository: FakeTenantResourceOwnershipRepository,
) {
  const app = express();
  app.use(express.json());
  app.use(createResolveTenantMiddleware(tenantRepository));

  app.get("/whoami", (req, res) => {
    res.status(200).json({ tenantId: req.tenantId ?? null });
  });

  app.get(
    "/empresas/:id",
    createRequireTenantAccessMiddleware(
      ownershipRepository,
      "Empresa",
      (req) => req.params.id ?? "",
    ),
    (req, res) => {
      res.status(200).json({ ok: true });
    },
  );

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const statusCode = (err as { kind?: string })?.kind === "FORBIDDEN" ? 403 : 500;
      res.status(statusCode).json({ error: String(err) });
    },
  );

  return app;
}

describe("resolveTenant.middleware", () => {
  it("popula req.tenantId quando o header aponta para um tenant ativo", async () => {
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
    const app = buildApp(tenantRepository, new FakeTenantResourceOwnershipRepository());

    const response = await request(app).get("/whoami").set("X-Tenant-Id", "tenant-a");

    expect(response.body.tenantId).toBe("tenant-a");
  });

  it("nunca bloqueia a requisição quando o header está ausente", async () => {
    const app = buildApp(new FakeTenantRepository(), new FakeTenantResourceOwnershipRepository());

    const response = await request(app).get("/whoami");

    expect(response.status).toBe(200);
    expect(response.body.tenantId).toBeNull();
  });

  it("ignora um tenant inativo", async () => {
    const tenantRepository = new FakeTenantRepository();
    tenantRepository.seed(
      Tenant.create({
        id: "tenant-a",
        nome: "Empresa A",
        slug: "empresa-a",
        ativo: false,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const app = buildApp(tenantRepository, new FakeTenantResourceOwnershipRepository());

    const response = await request(app).get("/whoami").set("X-Tenant-Id", "tenant-a");

    expect(response.body.tenantId).toBeNull();
  });
});

describe("requireTenantAccess.middleware", () => {
  it("permite acesso quando o tenant é o proprietário do recurso", async () => {
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
    ownershipRepository.seed(
      TenantResourceOwnership.create({
        id: "o1",
        tenantId: "tenant-a",
        resourceType: "Empresa",
        resourceId: "empresa-1",
        createdAt: NOW,
      }),
    );
    const app = buildApp(tenantRepository, ownershipRepository);

    const response = await request(app).get("/empresas/empresa-1").set("X-Tenant-Id", "tenant-a");

    expect(response.status).toBe(200);
  });

  it("nega acesso — Empresa A nunca acessa recurso da Empresa B", async () => {
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
    ownershipRepository.seed(
      TenantResourceOwnership.create({
        id: "o1",
        tenantId: "tenant-b",
        resourceType: "Empresa",
        resourceId: "empresa-1",
        createdAt: NOW,
      }),
    );
    const app = buildApp(tenantRepository, ownershipRepository);

    const response = await request(app).get("/empresas/empresa-1").set("X-Tenant-Id", "tenant-a");

    expect(response.status).toBe(403);
  });

  it("nega acesso quando nenhum tenant foi resolvido", async () => {
    const app = buildApp(new FakeTenantRepository(), new FakeTenantResourceOwnershipRepository());

    const response = await request(app).get("/empresas/empresa-1");

    expect(response.status).toBe(403);
  });
});
