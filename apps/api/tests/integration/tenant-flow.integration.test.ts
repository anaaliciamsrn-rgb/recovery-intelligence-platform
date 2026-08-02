import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Prova a garantia central da Etapa 9 — "Empresa A nunca pode acessar
 * Empresa B" — via `TenantResourceOwnership` (ver ADR 0028): esta é uma
 * fundação aditiva, não um retrofit sobre os módulos de negócio existentes.
 */
describe("Multi-Tenant Foundation", () => {
  const container = buildContainer();
  const userEmail = `tenant-test-${randomUUID()}@example.com`;
  const viewerEmail = `tenant-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  let accessToken: string;
  let viewerAccessToken: string;
  let tenantAId: string;
  let tenantBId: string;
  const slugA = `empresa-a-${randomUUID().slice(0, 8)}`;
  const slugB = `empresa-b-${randomUUID().slice(0, 8)}`;
  const recursoId = randomUUID();

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ADMIN"] },
    });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: viewerEmail, passwordHash, roles: ["VIEWER"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;

    const viewerLoginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: viewerEmail, password: userPassword });
    viewerAccessToken = viewerLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await container.prisma.tenantResourceOwnership.deleteMany({ where: { resourceId: recursoId } });
    await container.prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app)
      .post("/api/v1/tenants")
      .send({ nome: "Empresa A", slug: slugA });
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão tenant:manage (RBAC, ADR 0029)", async () => {
    const response = await request(container.app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({
        nome: "Empresa Não Autorizada",
        slug: `empresa-rejeitada-${randomUUID().slice(0, 8)}`,
      });
    expect(response.status).toBe(403);
  });

  it("cria dois tenants", async () => {
    const responseA = await request(container.app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "Empresa A", slug: slugA });
    const responseB = await request(container.app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "Empresa B", slug: slugB });

    expect(responseA.status).toBe(201);
    expect(responseB.status).toBe(201);
    tenantAId = responseA.body.id;
    tenantBId = responseB.body.id;
  });

  it("Empresa A nunca pode acessar um recurso da Empresa B", async () => {
    await request(container.app)
      .post(`/api/v1/tenants/${tenantAId}/resources`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ resourceType: "Empresa", resourceId: recursoId });

    const acessoA = await request(container.app)
      .get(`/api/v1/tenants/${tenantAId}/resources/Empresa/${recursoId}/access`)
      .set("Authorization", `Bearer ${accessToken}`);
    const acessoB = await request(container.app)
      .get(`/api/v1/tenants/${tenantBId}/resources/Empresa/${recursoId}/access`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(acessoA.body.podeAcessar).toBe(true);
    expect(acessoB.body.podeAcessar).toBe(false);
  });

  it("rejeita registrar o mesmo recurso para um segundo tenant", async () => {
    const response = await request(container.app)
      .post(`/api/v1/tenants/${tenantBId}/resources`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ resourceType: "Empresa", resourceId: recursoId });

    expect(response.status).toBe(409);
  });

  it("rejeita a criação de um tenant com slug duplicado", async () => {
    const response = await request(container.app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "Empresa A de novo", slug: slugA });

    expect(response.status).toBe(409);
  });

  it("lista e consulta tenants", async () => {
    const listResponse = await request(container.app)
      .get("/api/v1/tenants")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items.some((t: { id: string }) => t.id === tenantAId)).toBe(true);

    const getResponse = await request(container.app)
      .get(`/api/v1/tenants/${tenantAId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.slug).toBe(slugA);
  });
});
