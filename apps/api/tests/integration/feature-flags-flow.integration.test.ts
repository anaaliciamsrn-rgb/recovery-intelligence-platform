import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Feature Flags", () => {
  const container = buildContainer();
  const userEmail = `feature-flags-test-${randomUUID()}@example.com`;
  const viewerEmail = `feature-flags-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const chave = `modulo-teste-${randomUUID().slice(0, 8)}`;
  let accessToken: string;
  let viewerAccessToken: string;
  let featureFlagId: string;

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
    if (featureFlagId) {
      await container.prisma.featureFlagOverride.deleteMany({ where: { featureFlagId } });
      await container.prisma.featureFlag.deleteMany({ where: { id: featureFlagId } });
    }
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).post("/api/v1/feature-flags").send({});
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão feature-flag:write (RBAC, ADR 0029/0031)", async () => {
    const response = await request(container.app)
      .post("/api/v1/feature-flags")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({ chave, ativoPadrao: false });
    expect(response.status).toBe(403);
  });

  it("cria uma flag desativada por padrão", async () => {
    const response = await request(container.app)
      .post("/api/v1/feature-flags")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ chave, descricao: "flag de teste", ativoPadrao: false });

    expect(response.status).toBe(201);
    expect(response.body.ativoPadrao).toBe(false);
    featureFlagId = response.body.id;
  });

  it("avalia PADRAO quando não há nenhum override para o contexto", async () => {
    const response = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}/evaluate`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ativo: false, origem: "PADRAO" });
  });

  it("cria um override por tenant e ele passa a vencer o padrão para esse tenant", async () => {
    const setResponse = await request(container.app)
      .put(`/api/v1/feature-flags/${chave}/overrides`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ escopoTipo: "TENANT", escopoValor: "tenant-a", ativo: true });
    expect(setResponse.status).toBe(200);

    const comOverride = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}/evaluate`)
      .query({ tenantId: "tenant-a" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(comOverride.body).toEqual({ ativo: true, origem: "TENANT" });

    const semOverride = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}/evaluate`)
      .query({ tenantId: "outro-tenant" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(semOverride.body).toEqual({ ativo: false, origem: "PADRAO" });
  });

  it("override de usuário vence o de tenant", async () => {
    await request(container.app)
      .put(`/api/v1/feature-flags/${chave}/overrides`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ escopoTipo: "USUARIO", escopoValor: "user-1", ativo: false });

    const response = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}/evaluate`)
      .query({ tenantId: "tenant-a", userId: "user-1" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.body).toEqual({ ativo: false, origem: "USUARIO" });
  });

  it("remove um override e o escopo volta a herdar o override mais amplo aplicável", async () => {
    const removeResponse = await request(container.app)
      .delete(`/api/v1/feature-flags/${chave}/overrides/USUARIO/user-1`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(removeResponse.status).toBe(204);

    const response = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}/evaluate`)
      .query({ tenantId: "tenant-a", userId: "user-1" })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.body).toEqual({ ativo: true, origem: "TENANT" });
  });

  it("consulta a flag com todos os overrides ativos", async () => {
    const response = await request(container.app)
      .get(`/api/v1/feature-flags/${chave}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.overrides).toHaveLength(1);
    expect(response.body.overrides[0].escopoTipo).toBe("TENANT");
  });

  it("atualiza ativoPadrao da flag", async () => {
    const response = await request(container.app)
      .patch(`/api/v1/feature-flags/${chave}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ descricao: "atualizada", ativoPadrao: true });

    expect(response.status).toBe(200);
    expect(response.body.ativoPadrao).toBe(true);
  });

  it("lista flags e inclui a criada neste teste", async () => {
    const response = await request(container.app)
      .get("/api/v1/feature-flags")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.items.some((f: { chave: string }) => f.chave === chave)).toBe(true);
  });

  it("rejeita a criação de uma flag com chave duplicada", async () => {
    const response = await request(container.app)
      .post("/api/v1/feature-flags")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ chave, ativoPadrao: false });
    expect(response.status).toBe(409);
  });

  it("retorna 404 para uma flag inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/feature-flags/chave-inexistente-${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });
});
