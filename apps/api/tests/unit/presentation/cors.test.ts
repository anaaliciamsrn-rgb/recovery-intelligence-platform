import request from "supertest";
import { buildTestApp } from "../../support/build-test-app.js";

const ALLOWED_ORIGIN = "http://localhost:5173";
const BLOCKED_ORIGIN = "http://evil.example.com";

describe("CORS (security-headers.middleware)", () => {
  it("permite origem presente em CORS_ALLOWED_ORIGINS", async () => {
    const { app } = buildTestApp({ env: { CORS_ALLOWED_ORIGINS: ALLOWED_ORIGIN } });

    const response = await request(app).get("/api/v1/health").set("Origin", ALLOWED_ORIGIN);

    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
  });

  it("bloqueia origem fora de CORS_ALLOWED_ORIGINS com 403 (não 500)", async () => {
    const { app } = buildTestApp({ env: { CORS_ALLOWED_ORIGINS: ALLOWED_ORIGIN } });

    const response = await request(app).get("/api/v1/health").set("Origin", BLOCKED_ORIGIN);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite requisições sem header Origin (same-origin / server-to-server)", async () => {
    const { app } = buildTestApp({ env: { CORS_ALLOWED_ORIGINS: ALLOWED_ORIGIN } });

    const response = await request(app).get("/api/v1/health");

    expect(response.status).not.toBe(500);
  });
});
