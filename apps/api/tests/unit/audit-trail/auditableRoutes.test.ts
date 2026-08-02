import type { Request } from "express";
import {
  AUDITABLE_ROUTES,
  findAuditableRoute,
  normalizePattern,
} from "../../../src/modules/audit-trail/presentation/middlewares/auditableRoutes.js";

function fakeRequest(overrides: Partial<Request> = {}): Request {
  return { params: {}, body: {}, auth: undefined, ...overrides } as unknown as Request;
}

describe("normalizePattern", () => {
  it("remove a barra final, exceto na raiz", () => {
    expect(normalizePattern("/api/v1/pessoas/")).toBe("/api/v1/pessoas");
    expect(normalizePattern("/")).toBe("/");
    expect(normalizePattern("/api/v1/pessoas")).toBe("/api/v1/pessoas");
  });
});

describe("findAuditableRoute", () => {
  it("encontra cada uma das treze rotas auditáveis pelo método e padrão exatos", () => {
    expect(AUDITABLE_ROUTES).toHaveLength(13);
    for (const route of AUDITABLE_ROUTES) {
      expect(findAuditableRoute(route.method, route.pattern)).toBe(route);
    }
  });

  it("casa uma rota cujo path do Express termina em barra (ex.: POST /)", () => {
    const rota = findAuditableRoute("POST", "/api/v1/pessoas/");
    expect(rota?.tipo).toBe("PESSOA_CRIADA");
  });

  it("devolve undefined para uma rota fora da lista", () => {
    expect(findAuditableRoute("GET", "/api/v1/pessoas/123")).toBeUndefined();
    expect(findAuditableRoute("DELETE", "/api/v1/pessoas")).toBeUndefined();
  });
});

describe("extractors da rota de LOGIN", () => {
  const rota = AUDITABLE_ROUTES.find((r) => r.tipo === "LOGIN")!;

  it("extrai o id do usuário da resposta em caso de sucesso", () => {
    const ctx = {
      req: fakeRequest({ body: { email: "a@b.com", password: "segredo" } }),
      responseBody: { user: { id: "user-1" } },
    };

    expect(rota.extractEntidadeId(ctx)).toBe("user-1");
    expect(rota.extractUsuarioId(ctx)).toBe("user-1");
  });

  it("devolve null quando a resposta não tem usuário (falha de login)", () => {
    const ctx = {
      req: fakeRequest({ body: { email: "a@b.com", password: "errada" } }),
      responseBody: { error: { message: "Credenciais inválidas" } },
    };

    expect(rota.extractEntidadeId(ctx)).toBeNull();
    expect(rota.extractUsuarioId(ctx)).toBeNull();
  });

  it("nunca inclui a senha no payload", () => {
    const ctx = {
      req: fakeRequest({ body: { email: "a@b.com", password: "segredo" } }),
      responseBody: { user: { id: "user-1" } },
    };

    const payload = rota.extractPayload(ctx) as { request: { password?: string } };
    expect(payload.request.password).toBeUndefined();
  });
});

describe("extractors da rota de LOGOUT", () => {
  const rota = AUDITABLE_ROUTES.find((r) => r.tipo === "LOGOUT")!;

  it("nunca infere o usuário — logout não expõe isso na fronteira HTTP", () => {
    const ctx = { req: fakeRequest(), responseBody: null };

    expect(rota.extractUsuarioId(ctx)).toBeNull();
    expect(rota.extractEntidadeId(ctx)).toBeNull();
  });
});

describe("extractors da rota de EVIDENCIA_ATUALIZADA", () => {
  const rota = AUDITABLE_ROUTES.find((r) => r.tipo === "EVIDENCIA_ATUALIZADA")!;

  it("extrai o dossieId a partir dos params da rota", () => {
    const ctx = { req: fakeRequest({ params: { id: "dossie-1" } }), responseBody: null };

    expect(rota.extractEntidadeId(ctx)).toBe("dossie-1");
  });
});

describe("extractors da rota de PLANILHA_IMPORTADA", () => {
  const rota = AUDITABLE_ROUTES.find((r) => r.tipo === "PLANILHA_IMPORTADA")!;

  it("nunca inclui o buffer do arquivo no payload — só nome e tamanho", () => {
    const req = fakeRequest({}) as Request & { file?: { originalname: string; size: number } };
    req.file = { originalname: "lista.xlsx", size: 1024 };
    const ctx = { req, responseBody: { importBatchId: "lote-1" } };

    expect(rota.extractEntidadeId(ctx)).toBe("lote-1");
    expect(rota.extractPayload(ctx)).toEqual({
      request: { nomeArquivo: "lista.xlsx", tamanhoBytes: 1024 },
      response: { importBatchId: "lote-1" },
    });
  });
});
