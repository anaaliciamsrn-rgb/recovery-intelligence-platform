import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Exercita o fluxo real (login → criar Pessoa → criar Dossiê → registrar
 * evidência → classificar) e verifica que o middleware de auditoria (ver
 * ADR 0021) gravou um evento por ação, consultável pelos cinco endpoints
 * de leitura — sem nenhuma alteração nos módulos observados.
 */
describe("Audit Trail", () => {
  const container = buildContainer();
  const userEmail = `audit-trail-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "96314725828";
  const loginRequestId = `req-login-${randomUUID()}`;
  let accessToken: string;
  let userId: string;
  let pessoaId: string;
  let dossieId: string;

  // O middleware grava o evento de forma assíncrona, sem bloquear a
  // resposta (fire-and-forget, de propósito — ver ADR 0021). Um pequeno
  // atraso entre cada ação e a próxima garante que a escrita já aconteceu
  // antes das asserções, sem acoplar o teste a um mecanismo de callback.
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .set("X-Request-Id", loginRequestId)
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
    await wait(50);

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito Auditado" });
    pessoaId = pessoaResponse.body.id;
    await wait(50);

    const dossieResponse = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    dossieId = dossieResponse.body.id;
    await wait(50);

    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.9,
      });
    await wait(50);

    await request(container.app)
      .get(`/api/v1/classificacoes/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    await wait(50);
  });

  afterAll(async () => {
    await container.prisma.auditEvent.deleteMany({ where: { usuarioId: userId } });
    await container.prisma.auditEvent.deleteMany({ where: { requestId: loginRequestId } });
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação em todos os endpoints de leitura", async () => {
    const respostas = await Promise.all([
      request(container.app).get("/api/v1/audit"),
      request(container.app).get(`/api/v1/audit/entity/Pessoa/${pessoaId}`),
      request(container.app).get(`/api/v1/audit/user/${userId}`),
      request(container.app).get(`/api/v1/audit/request/${loginRequestId}`),
    ]);

    for (const resposta of respostas) expect(resposta.status).toBe(401);
  });

  it("registrou um evento PESSOA_CRIADA consultável por GET /audit com filtro de tipo", async () => {
    const response = await request(container.app)
      .get("/api/v1/audit")
      .query({ tipo: "PESSOA_CRIADA", usuarioId: userId })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].entidade).toBe("Pessoa");
    expect(response.body.items[0].entidadeId).toBe(pessoaId);
    expect(response.body.items[0].outcome).toBe("SUCESSO");
  });

  it("consulta um evento específico por id via GET /audit/:id", async () => {
    const lista = await request(container.app)
      .get("/api/v1/audit")
      .query({ tipo: "DOSSIE_CRIADO", usuarioId: userId })
      .set("Authorization", `Bearer ${accessToken}`);
    const eventoId = lista.body.items[0].id;

    const response = await request(container.app)
      .get(`/api/v1/audit/${eventoId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(eventoId);
    expect(response.body.entidadeId).toBe(dossieId);
  });

  it("retorna 404 para um id de evento inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/audit/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it("consulta eventos por entidade via GET /audit/entity/:entity/:id", async () => {
    const response = await request(container.app)
      .get(`/api/v1/audit/entity/Dossie/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const tipos = response.body.items.map((item: { tipo: string }) => item.tipo);
    expect(tipos).toEqual(
      expect.arrayContaining(["DOSSIE_CRIADO", "EVIDENCIA_ATUALIZADA", "CLASSIFICACAO_EXECUTADA"]),
    );
  });

  it("consulta eventos por usuário via GET /audit/user/:userId, paginado", async () => {
    const response = await request(container.app)
      .get(`/api/v1/audit/user/${userId}`)
      .query({ pageSize: 2, page: 1 })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeLessThanOrEqual(2);
    expect(response.body.total).toBeGreaterThanOrEqual(4); // pessoa, dossie, evidencia, classificacao
  });

  it("consulta o evento de LOGIN por requestId e nunca expõe a senha em texto puro", async () => {
    const response = await request(container.app)
      .get(`/api/v1/audit/request/${loginRequestId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    const evento = response.body.items[0];
    expect(evento.tipo).toBe("LOGIN");
    expect(evento.usuarioId).toBe(userId);
    expect(JSON.stringify(evento.payload)).not.toContain(userPassword);
  });
});
