import express from "express";
import request from "supertest";
import type { ILogger } from "../../../src/application/ports/ILogger.js";
import { errorHandlerMiddleware } from "../../../src/presentation/http/middlewares/error-handler.middleware.js";
import { requestIdMiddleware } from "../../../src/presentation/http/middlewares/request-id.middleware.js";
import { Permission } from "../../../src/modules/identity/domain/value-objects/Permission.js";
import { createAuthenticateMiddleware } from "../../../src/modules/identity/presentation/middlewares/authenticate.middleware.js";
import { createAuthorizeMiddleware } from "../../../src/modules/identity/presentation/middlewares/authorize.middleware.js";
import type { Env } from "../../../src/shared/config/env.js";
import { FakeTokenProvider } from "./fakes.js";

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

// Só NODE_ENV é lido pelo error handler nesta rota isolada — cast pragmático.
const minimalEnv = { NODE_ENV: "test" } as Env;

function buildApp() {
  const tokenProvider = new FakeTokenProvider();
  const app = express();

  app.use(requestIdMiddleware);
  app.get("/protected", createAuthenticateMiddleware(tokenProvider), (req, res) => {
    res.json({ auth: req.auth });
  });
  app.get(
    "/admin-only",
    createAuthenticateMiddleware(tokenProvider),
    createAuthorizeMiddleware(Permission.REVOKE_ANY_SESSION),
    (_req, res) => res.json({ ok: true }),
  );
  app.use(errorHandlerMiddleware(noopLogger, minimalEnv));

  return { app, tokenProvider };
}

describe("authenticateMiddleware", () => {
  it("responde 401 quando não há header Authorization", async () => {
    const { app } = buildApp();
    const response = await request(app).get("/protected");
    expect(response.status).toBe(401);
  });

  it("responde 401 quando o token é inválido", async () => {
    const { app } = buildApp();
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer token-invalido");
    expect(response.status).toBe(401);
  });

  it("popula req.auth e segue quando o token é válido", async () => {
    const { app, tokenProvider } = buildApp();
    const token = tokenProvider.signAccessToken(
      { sub: "user-1", sid: "session-1", roles: ["VIEWER"] },
      900,
    );

    const response = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.auth).toEqual({
      userId: "user-1",
      sessionId: "session-1",
      roles: ["VIEWER"],
    });
  });
});

describe("authorizeMiddleware", () => {
  it("responde 403 quando o papel não tem a permissão exigida", async () => {
    const { app, tokenProvider } = buildApp();
    const token = tokenProvider.signAccessToken(
      { sub: "user-1", sid: "session-1", roles: ["VIEWER"] },
      900,
    );

    const response = await request(app).get("/admin-only").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("permite quando o papel tem a permissão exigida", async () => {
    const { app, tokenProvider } = buildApp();
    const token = tokenProvider.signAccessToken(
      { sub: "user-1", sid: "session-1", roles: ["ADMIN"] },
      900,
    );

    const response = await request(app).get("/admin-only").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
