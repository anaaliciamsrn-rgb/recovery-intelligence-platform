import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Recommendation Engine", () => {
  const container = buildContainer();
  const userEmail = `recommendation-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  // CPF distinto de outros arquivos de integration test — ver ADR 0015.
  const cpfCadastrado = "64718923069";
  let accessToken: string;
  let pessoaId: string;
  let dossieId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Sujeito Recomendado" },
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
    const response = await request(container.app).get(`/api/v1/recomendacoes/${dossieId}`);
    expect(response.status).toBe(401);
  });

  it("recomenda WHATSAPP para um dossiê vazio (BAIXO_RISCO)", async () => {
    const response = await request(container.app)
      .get(`/api/v1/recomendacoes/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.classificacao.classe).toBe("BAIXO_RISCO");
    expect(response.body.recomendacoes.map((r: { canal: string }) => r.canal)).toContain(
      "WHATSAPP",
    );
    expect(
      response.body.recomendacoes.every(
        (r: { justificativa: string }) => r.justificativa.length > 0,
      ),
    ).toBe(true);
  });

  it("recomenda COBRANCA_JURIDICA depois de registrar pendência fiscal com confiança geral suficiente", async () => {
    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.95,
      });
    // Duas evidências adicionais respondidas para tirar a confiança geral da
    // faixa BAIXA (1/5 = 0.2 seria BAIXA; 3/5 = 0.6 é MEDIA) — sem isso o
    // motor corretamente recusa recomendar ação drástica com dados
    // incompletos e cai no fallback (ver ADR 0017).
    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ fonte: "DATAJUD", status: "NAO_ENCONTRADO", confidenceScore: 0.9 });
    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ fonte: "RECEITA_FEDERAL", status: "NAO_ENCONTRADO", confidenceScore: 0.9 });

    const response = await request(container.app)
      .get(`/api/v1/recomendacoes/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.classificacao.classe).toBe("ALTO_RISCO");
    const canais = response.body.recomendacoes.map((r: { canal: string }) => r.canal);
    expect(canais).toContain("COBRANCA_JURIDICA");
    expect(canais).toContain("PARCELAMENTO");
  });

  it("retorna 404 para dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/recomendacoes/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
