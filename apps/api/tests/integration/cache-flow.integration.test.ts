import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Cache Layer", () => {
  const container = buildContainer();
  const userEmail = `cache-test-${randomUUID()}@example.com`;
  const viewerEmail = `cache-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const namespace = `namespace-teste-${randomUUID().slice(0, 8)}`;
  let accessToken: string;
  let viewerAccessToken: string;

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
    await container.redis.del(
      `cache:${namespace}`,
      `cache:${namespace}:d1`,
      `cache:${namespace}:d2`,
      `cache:stats:${namespace}:hits`,
      `cache:stats:${namespace}:misses`,
    );
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app)
      .put(`/api/v1/cache/entries/${namespace}`)
      .send({ valor: "x" });
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão cache:write (RBAC, ADR 0029/0033)", async () => {
    const response = await request(container.app)
      .put(`/api/v1/cache/entries/${namespace}`)
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({ valor: "x" });
    expect(response.status).toBe(403);
  });

  it("miss antes de qualquer gravação", async () => {
    const response = await request(container.app)
      .get(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d1" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ hit: false, valor: null, ttlRestanteSegundos: null });
  });

  it("grava e lê de volta, com TTL configurável explícito", async () => {
    const setResponse = await request(container.app)
      .put(`/api/v1/cache/entries/${namespace}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ identifier: "d1", valor: { score: 87 }, ttlSegundos: 30 });

    expect(setResponse.status).toBe(200);
    expect(setResponse.body.ttlSegundos).toBe(30);

    const getResponse = await request(container.app)
      .get(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d1" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(getResponse.body.hit).toBe(true);
    expect(getResponse.body.valor).toEqual({ score: 87 });
    expect(getResponse.body.ttlRestanteSegundos).toBeGreaterThan(0);
    expect(getResponse.body.ttlRestanteSegundos).toBeLessThanOrEqual(30);
  });

  it("invalida só o identifier informado, sem afetar outra entrada do mesmo namespace", async () => {
    await request(container.app)
      .put(`/api/v1/cache/entries/${namespace}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ identifier: "d2", valor: "outro-valor" });

    const invalidateResponse = await request(container.app)
      .delete(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d1" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(invalidateResponse.status).toBe(200);
    expect(invalidateResponse.body).toEqual({ chavesRemovidas: 1 });

    const d1 = await request(container.app)
      .get(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d1" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(d1.body.hit).toBe(false);
    const d2 = await request(container.app)
      .get(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d2" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(d2.body.hit).toBe(true);
  });

  it("invalida o namespace inteiro de uma vez quando nenhum identifier é informado", async () => {
    const invalidateResponse = await request(container.app)
      .delete(`/api/v1/cache/entries/${namespace}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(invalidateResponse.status).toBe(200);
    expect(invalidateResponse.body.chavesRemovidas).toBeGreaterThanOrEqual(1);

    const d2 = await request(container.app)
      .get(`/api/v1/cache/entries/${namespace}`)
      .query({ identifier: "d2" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(d2.body.hit).toBe(false);
  });

  it("reporta estatísticas de hit/miss acumuladas para o namespace", async () => {
    const response = await request(container.app)
      .get(`/api/v1/cache/stats/${namespace}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.namespace).toBe(namespace);
    expect(response.body.hits).toBeGreaterThan(0);
    expect(response.body.misses).toBeGreaterThan(0);
  });

  it("rejeita um namespace com caracteres inválidos", async () => {
    const response = await request(container.app)
      .put("/api/v1/cache/entries/namespace%20invalido")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ valor: "x" });
    expect(response.status).toBe(400);
  });
});
