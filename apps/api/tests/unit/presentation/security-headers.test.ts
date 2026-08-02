import request from "supertest";
import { buildTestApp } from "../../support/build-test-app.js";

describe("Helmet (security-headers.middleware)", () => {
  it("aplica os headers de segurança padrão do Helmet", async () => {
    const { app } = buildTestApp();

    const response = await request(app).get("/api/v1/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toBeDefined();
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-site");
    expect(response.headers["referrer-policy"]).toBeDefined();
  });

  it("não expõe o header X-Powered-By", async () => {
    const { app } = buildTestApp();

    const response = await request(app).get("/api/v1/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
