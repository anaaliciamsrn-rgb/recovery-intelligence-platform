import express from "express";
import request from "supertest";
import { buildTestApp } from "../../support/build-test-app.js";
import { FakeRedisCommandClient } from "../../support/fake-redis-command-client.js";
import { createRateLimitMiddleware } from "../../../src/presentation/http/middlewares/rate-limit.middleware.js";

describe("Rate limiting (rate-limit.middleware, Redis-backed)", () => {
  it("permite requisições dentro do limite", async () => {
    const { app } = buildTestApp({
      env: { RATE_LIMIT_MAX_REQUESTS: 2, RATE_LIMIT_WINDOW_MS: 60_000 },
      redis: new FakeRedisCommandClient(),
    });

    const first = await request(app).get("/api/v1/health");
    const second = await request(app).get("/api/v1/health");

    expect(first.status).not.toBe(429);
    expect(second.status).not.toBe(429);
  });

  it("responde 429 após exceder RATE_LIMIT_MAX_REQUESTS", async () => {
    const { app } = buildTestApp({
      env: { RATE_LIMIT_MAX_REQUESTS: 2, RATE_LIMIT_WINDOW_MS: 60_000 },
      redis: new FakeRedisCommandClient(),
    });

    await request(app).get("/api/v1/health");
    await request(app).get("/api/v1/health");
    const third = await request(app).get("/api/v1/health");

    expect(third.status).toBe(429);
  });

  it("inclui os headers padrão de rate limit na resposta", async () => {
    const { app } = buildTestApp({
      env: { RATE_LIMIT_MAX_REQUESTS: 5, RATE_LIMIT_WINDOW_MS: 60_000 },
      redis: new FakeRedisCommandClient(),
    });

    const response = await request(app).get("/api/v1/health");

    expect(response.headers["ratelimit-limit"]).toBe("5");
    expect(response.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("contadores são isolados por instância de Redis (independência entre testes)", async () => {
    const { app } = buildTestApp({
      env: { RATE_LIMIT_MAX_REQUESTS: 1, RATE_LIMIT_WINDOW_MS: 60_000 },
      redis: new FakeRedisCommandClient(),
    });

    const first = await request(app).get("/api/v1/health");

    expect(first.status).not.toBe(429);
  });

  it("regressão: dois limiters com keyPrefix distintos (ex.: global vs login), no mesmo Redis, não compartilham contador", async () => {
    const redis = new FakeRedisCommandClient();
    const globalLimiter = createRateLimitMiddleware(redis, {
      windowMs: 60_000,
      max: 2,
      keyPrefix: "rl:global:",
    });
    const loginLimiter = createRateLimitMiddleware(redis, {
      windowMs: 60_000,
      max: 2,
      keyPrefix: "rl:login:",
    });

    const app = express();
    app.get("/other", globalLimiter, (_req, res) => res.json({ ok: true }));
    app.post("/login", loginLimiter, (_req, res) => res.json({ ok: true }));

    // Esgota o limiter global via uma rota que não é a de login.
    await request(app).get("/other");
    await request(app).get("/other");
    const thirdOther = await request(app).get("/other");
    expect(thirdOther.status).toBe(429);

    // O limiter de login tem seu próprio contador (prefixo distinto) — não
    // pode estar afetado pelas 3 requisições acima, mesmo compartilhando o
    // mesmo cliente Redis e o mesmo IP de origem.
    const firstLogin = await request(app).post("/login");
    const secondLogin = await request(app).post("/login");
    expect(firstLogin.status).not.toBe(429);
    expect(secondLogin.status).not.toBe(429);
  });
});
