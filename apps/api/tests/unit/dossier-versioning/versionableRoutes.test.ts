import type { Request } from "express";
import {
  findVersionableRoute,
  normalizePattern,
  VERSIONABLE_ROUTES,
} from "../../../src/modules/dossier-versioning/presentation/middlewares/versionableRoutes.js";

function fakeRequest(overrides: Partial<Request> = {}): Request {
  return { params: {}, body: {}, ...overrides } as unknown as Request;
}

describe("normalizePattern", () => {
  it("remove a barra final, exceto na raiz", () => {
    expect(normalizePattern("/api/v1/dossies/")).toBe("/api/v1/dossies");
    expect(normalizePattern("/")).toBe("/");
  });
});

describe("findVersionableRoute", () => {
  it("encontra as duas rotas versionáveis pelo método e padrão exatos", () => {
    expect(VERSIONABLE_ROUTES).toHaveLength(2);
    for (const route of VERSIONABLE_ROUTES) {
      expect(findVersionableRoute(route.method, route.pattern)).toBe(route);
    }
  });

  it("casa a rota de criação cujo path do Express termina em barra (POST /)", () => {
    expect(findVersionableRoute("POST", "/api/v1/dossies/")).toBeDefined();
  });

  it("devolve undefined para uma rota fora da lista", () => {
    expect(findVersionableRoute("GET", "/api/v1/dossies/123")).toBeUndefined();
    expect(findVersionableRoute("DELETE", "/api/v1/dossies")).toBeUndefined();
  });
});

describe("extractors", () => {
  it("extrai o id do dossiê da resposta na criação", () => {
    const rota = VERSIONABLE_ROUTES.find((r) => r.pattern === "/api/v1/dossies")!;
    const ctx = { req: fakeRequest(), responseBody: { id: "dossie-1" } };

    expect(rota.extractDossieId(ctx)).toBe("dossie-1");
  });

  it("devolve null quando a resposta de criação não tem id", () => {
    const rota = VERSIONABLE_ROUTES.find((r) => r.pattern === "/api/v1/dossies")!;
    const ctx = { req: fakeRequest(), responseBody: { error: { message: "falhou" } } };

    expect(rota.extractDossieId(ctx)).toBeNull();
  });

  it("extrai o id do dossiê dos params na atualização de evidência", () => {
    const rota = VERSIONABLE_ROUTES.find((r) => r.pattern === "/api/v1/dossies/:id/evidencias")!;
    const ctx = { req: fakeRequest({ params: { id: "dossie-42" } }), responseBody: null };

    expect(rota.extractDossieId(ctx)).toBe("dossie-42");
  });
});
