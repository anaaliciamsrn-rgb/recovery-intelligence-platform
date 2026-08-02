import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Prompt Builder", () => {
  const container = buildContainer();
  const userEmail = `prompt-builder-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  // CPF distinto de outros arquivos de integration test — ver ADR 0015.
  const cpfCadastrado = "91472583655";
  let accessToken: string;
  let pessoaId: string;
  let dossieId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Sujeito do Prompt" },
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

    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "RECEITA_FEDERAL",
        status: "ENCONTRADO",
        valor: { situacaoCadastral: "ATIVA" },
        confidenceScore: 0.85,
      });
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
    const response = await request(container.app).get(`/api/v1/prompts/${dossieId}`);
    expect(response.status).toBe(401);
  });

  it("produz JSON estruturado e texto pronto para LLM a partir da mesma fonte", async () => {
    const response = await request(container.app)
      .get(`/api/v1/prompts/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const { structured, text } = response.body;

    expect(structured.dossieId).toBe(dossieId);
    expect(structured.subject.nome).toBe("Sujeito do Prompt");
    expect(structured.subject.documento).toBe(cpfCadastrado);
    expect(structured.classificacao.classe).toBe("BAIXO_RISCO");
    expect(structured.classificacao.fatores[0].nome).toBe("Situação Cadastral (Receita Federal)");
    expect(Array.isArray(structured.recomendacoes)).toBe(true);

    expect(typeof text).toBe("string");
    expect(text).toContain("Sujeito do Prompt");
    expect(text).toContain(cpfCadastrado);
    expect(text).toContain("BAIXO_RISCO");
    expect(text).toContain("Situação Cadastral (Receita Federal)");
  });

  it("retorna 404 para dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/prompts/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
