import request from "supertest";
import { buildTestApp } from "../../support/build-test-app.js";

describe("Request ID (request-id.middleware)", () => {
  it("gera um X-Request-Id quando nenhum é enviado", async () => {
    const { app } = buildTestApp();

    const response = await request(app).get("/api/v1/health");

    expect(response.headers["x-request-id"]).toBeDefined();
    expect(response.headers["x-request-id"].length).toBeGreaterThan(0);
  });

  it("propaga o X-Request-Id recebido na requisição", async () => {
    const { app } = buildTestApp();
    const incomingRequestId = "meu-request-id-de-teste-123";

    const response = await request(app)
      .get("/api/v1/health")
      .set("X-Request-Id", incomingRequestId);

    expect(response.headers["x-request-id"]).toBe(incomingRequestId);
  });

  it("gera IDs diferentes para requisições diferentes", async () => {
    const { app } = buildTestApp();

    const first = await request(app).get("/api/v1/health");
    const second = await request(app).get("/api/v1/health");

    expect(first.headers["x-request-id"]).not.toBe(second.headers["x-request-id"]);
  });
});
