import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Motor de Classificação", () => {
  const container = buildContainer();
  const userEmail = `classification-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  // CPF distinto de outros arquivos de integration test — ver ADR 0015 sobre
  // a colisão de fixtures encontrada na Sprint 6.
  const cpfCadastrado = "33344455508";
  let accessToken: string;
  let pessoaId: string;
  let dossieId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Sujeito Classificado" },
    });
    pessoaId = pessoa.id;

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;

    const dossieResponse = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    dossieId = dossieResponse.body.id;
  });

  afterAll(async () => {
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).get(`/api/v1/classificacoes/${dossieId}`);
    expect(response.status).toBe(401);
  });

  it("classifica um dossiê vazio como BAIXO_RISCO com confiança 0", async () => {
    const response = await request(container.app)
      .get(`/api/v1/classificacoes/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.classe).toBe("BAIXO_RISCO");
    expect(response.body.score).toBe(0);
    expect(response.body.confianca).toBe(0);
    expect(response.body.fatores).toEqual([]);
  });

  it("reclassifica como ALTO_RISCO depois de registrar uma evidência desfavorável", async () => {
    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.9,
      });

    const response = await request(container.app)
      .get(`/api/v1/classificacoes/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.classe).toBe("ALTO_RISCO");
    expect(response.body.score).toBe(1);
    expect(response.body.fatores).toHaveLength(1);
    expect(response.body.fatores[0].nome).toBe("Pendência Fiscal (PGFN)");
    expect(response.body.fatores[0].direcao).toBe("AUMENTA_RISCO");
    expect(response.body.justificativaGeral).toContain("Pendência Fiscal");
  });

  it("retorna 404 para dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/classificacoes/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
