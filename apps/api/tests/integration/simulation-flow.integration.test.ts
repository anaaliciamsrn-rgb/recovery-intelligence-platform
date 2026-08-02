import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Exercita o fluxo real (criar Pessoa → criar Dossiê → registrar evidência
 * PGFN) e depois simula a remoção dessa evidência — verificando que o
 * resultado da simulação reflete a mudança e que o Dossiê real, no banco,
 * permanece absolutamente intocado (ver ADR 0023).
 */
describe("Simulation & Decision Lab", () => {
  const container = buildContainer();
  const userEmail = `simulation-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "74162983500";
  let accessToken: string;
  let pessoaId: string;
  let dossieId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito da Simulação" });
    pessoaId = pessoaResponse.body.id;

    const dossieResponse = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    dossieId = dossieResponse.body.id;

    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.9,
      });
  });

  afterAll(async () => {
    await container.prisma.versionSnapshot.deleteMany({ where: { dossieId } });
    await container.prisma.auditEvent.deleteMany({ where: { entidadeId: pessoaId } });
    await container.prisma.auditEvent.deleteMany({ where: { entidadeId: dossieId } });
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app)
      .post("/api/v1/simulation")
      .send({ dossieId, changes: [] });
    expect(response.status).toBe(401);
  });

  it("retorna 404 para um dossiê inexistente", async () => {
    const response = await request(container.app)
      .post("/api/v1/simulation")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dossieId: randomUUID(), changes: [] });

    expect(response.status).toBe(404);
  });

  it("rejeita um corpo de requisição inválido", async () => {
    const response = await request(container.app)
      .post("/api/v1/simulation")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dossieId, changes: [{ tipo: "TIPO_INEXISTENTE" }] });

    expect(response.status).toBe(400);
  });

  it("simula a resolução da pendência da PGFN e nunca altera o dossiê real", async () => {
    const response = await request(container.app)
      .post("/api/v1/simulation")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dossieId, changes: [{ tipo: "EVIDENCIA", fonte: "PGFN", acao: "REMOVER" }] });

    expect(response.status).toBe(200);
    expect(response.body.antes.classificacao).toBe("ALTO_RISCO");
    expect(response.body.depois.classificacao).toBe("BAIXO_RISCO");
    expect(response.body.deltas.riskScoreDelta).toBeLessThan(0);
    expect(response.body.mudancasDetectadas).toContain("PGFN removida");
    expect(response.body.impactos).toHaveLength(1);
    expect(response.body.impactos[0].afetouRisco).toBe(true);
    expect(response.body.resumo).toContain("PGFN");
    expect(response.body.comparacao.score.old).toBe(1);
    expect(response.body.comparacao.score.new).toBe(0);

    const dossieReal = await request(container.app)
      .get(`/api/v1/dossies/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(dossieReal.body.evidencias.pgfn.status).toBe("ENCONTRADO");
    expect(dossieReal.body.evidencias.pgfn.valor).toEqual({ temPendencia: true });
  });
});
