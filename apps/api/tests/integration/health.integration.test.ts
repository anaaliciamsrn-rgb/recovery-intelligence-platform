import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo):
 *   docker compose up -d postgres redis
 */
describe("GET /api/v1/health", () => {
  const container = buildContainer();

  afterAll(async () => {
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("responde 200 com as dependências ok quando Postgres e Redis estão disponíveis", async () => {
    const response = await request(container.app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      dependencies: {
        database: { status: "ok" },
        cache: { status: "ok" },
      },
    });
    expect(response.body.app.version).toBeDefined();
    expect(response.body.runtime.memory.rssMb).toBeGreaterThan(0);
  });

  it("inclui X-Request-Id na resposta", async () => {
    const response = await request(container.app).get("/api/v1/health");

    expect(response.headers["x-request-id"]).toBeDefined();
  });
});
