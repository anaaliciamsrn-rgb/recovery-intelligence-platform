import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Rule Builder", () => {
  const container = buildContainer();
  const userEmail = `rule-builder-test-${randomUUID()}@example.com`;
  const viewerEmail = `rule-builder-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const recurso = `recurso-teste-${randomUUID().slice(0, 8)}`;
  let accessToken: string;
  let viewerAccessToken: string;
  let ruleDefinitionId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ADMIN"] },
    });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: viewerEmail, passwordHash, roles: ["VIEWER"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;

    const viewerLoginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: viewerEmail, password: userPassword });
    viewerAccessToken = viewerLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    if (ruleDefinitionId) {
      await container.prisma.ruleVersionEntry.deleteMany({ where: { ruleDefinitionId } });
      await container.prisma.ruleDefinition.deleteMany({ where: { id: ruleDefinitionId } });
    }
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).post("/api/v1/rules").send({});
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão rule:write (RBAC, ADR 0029/0030)", async () => {
    const response = await request(container.app)
      .post("/api/v1/rules")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({
        nome: "x",
        recurso,
        condicoes: [{ campo: "a", operador: "IGUAL", valor: 1 }],
        peso: 1,
        prioridade: 1,
        acao: "A",
      });
    expect(response.status).toBe(403);
  });

  it("cria uma regra configurável — só dados, nenhum código novo", async () => {
    const response = await request(container.app)
      .post("/api/v1/rules")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        nome: "Dívida vencida há mais de 90 dias",
        descricao: "Score alto para dívidas antigas",
        recurso,
        condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 90 }],
        peso: 10,
        prioridade: 5,
        acao: "AUMENTAR_RISCO",
      });

    expect(response.status).toBe(201);
    expect(response.body.versaoAtual).toBe(1);
    expect(response.body.ativo).toBe(true);
    ruleDefinitionId = response.body.id;
  });

  it("revisa a regra, avança a versão e preserva o histórico", async () => {
    const response = await request(container.app)
      .patch(`/api/v1/rules/${ruleDefinitionId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        nome: "Dívida vencida há mais de 120 dias",
        descricao: "Limite endurecido",
        condicoes: [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 120 }],
        peso: 15,
        prioridade: 5,
        acao: "AUMENTAR_RISCO",
        ativo: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.versaoAtual).toBe(2);

    const detalhe = await request(container.app)
      .get(`/api/v1/rules/${ruleDefinitionId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detalhe.body.versoes).toHaveLength(2);
    expect(detalhe.body.versoes.map((v: { versao: number }) => v.versao)).toEqual([2, 1]);
    expect(detalhe.body.versoes[1].nome).toBe("Dívida vencida há mais de 90 dias");
  });

  it("avalia o contexto contra as regras ativas do recurso e devolve a pontuação agregada", async () => {
    const casa = await request(container.app)
      .post("/api/v1/rules/evaluate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ recurso, contexto: { diasAtraso: 150 } });

    expect(casa.status).toBe(200);
    expect(casa.body.regrasCasadas).toHaveLength(1);
    expect(casa.body.pontuacaoTotal).toBe(15);

    const naoCasa = await request(container.app)
      .post("/api/v1/rules/evaluate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ recurso, contexto: { diasAtraso: 10 } });

    expect(naoCasa.status).toBe(200);
    expect(naoCasa.body.regrasCasadas).toHaveLength(0);
    expect(naoCasa.body.pontuacaoTotal).toBe(0);
  });

  it("lista regras filtrando por recurso", async () => {
    const response = await request(container.app)
      .get("/api/v1/rules")
      .query({ recurso })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.some((r: { id: string }) => r.id === ruleDefinitionId)).toBe(true);
  });

  it("retorna 404 para uma regra inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/rules/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });

  it("rejeita a criação de uma regra sem nenhuma condição", async () => {
    const response = await request(container.app)
      .post("/api/v1/rules")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "Regra inválida", recurso, condicoes: [], peso: 1, prioridade: 1, acao: "A" });

    expect(response.status).toBe(400);
  });
});
