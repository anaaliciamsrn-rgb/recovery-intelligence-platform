import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

describe("Rota inexistente", () => {
  const container = buildContainer();

  afterAll(async () => {
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("responde 404 no formato padrão de erro", async () => {
    const response = await request(container.app).get("/api/v1/rota-que-nao-existe");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND" });
    expect(response.body.error.requestId).toBeDefined();
  });
});
