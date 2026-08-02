import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo):
 *   docker compose up -d postgres redis
 */
describe("Fluxo de autenticação (login -> refresh -> logout)", () => {
  const container = buildContainer();
  const email = `test-${randomUUID()}@example.com`;
  const password = "senha-forte-de-teste-123";

  beforeAll(async () => {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email, passwordHash, roles: ["VIEWER"] },
    });
  });

  afterAll(async () => {
    await container.prisma.user.deleteMany({ where: { email } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("faz login, rotaciona via refresh, e detecta reuso do token antigo", async () => {
    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toBeDefined();
    const loginCookies = loginResponse.headers["set-cookie"];
    expect(loginCookies).toBeDefined();

    const refreshResponse = await request(container.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", loginCookies);

    expect(refreshResponse.status).toBe(200);
    const rotatedCookies = refreshResponse.headers["set-cookie"];

    // Regressão de segurança: reapresentar o cookie de login (já rotacionado)
    // é reuso — deve falhar E revogar a sessão inteira.
    const reuseResponse = await request(container.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", loginCookies);
    expect(reuseResponse.status).toBe(401);

    // O cookie novo (legítimo, nunca antes usado) também deve estar bloqueado
    // agora, porque a sessão foi revogada por causa do reuso detectado acima.
    const blockedResponse = await request(container.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", rotatedCookies);
    expect(blockedResponse.status).toBe(401);
  });

  it("faz logout e o cookie deixa de servir para refresh", async () => {
    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    const cookies = loginResponse.headers["set-cookie"];

    const logoutResponse = await request(container.app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookies);
    expect(logoutResponse.status).toBe(204);

    const refreshAfterLogout = await request(container.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookies);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("rejeita senha errada com 401 genérico", async () => {
    const response = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email, password: "senha-errada" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
