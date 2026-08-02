import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Usa uma Pessoa real (já cadastrada via módulo party) como candidato para
 * provar que a fundação de resolução de identidade está de fato ligada aos
 * dados existentes, não só aos contratos.
 */
describe("Identity Resolution (fundação)", () => {
  const container = buildContainer();
  const userEmail = `identity-resolution-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "11144477735";
  let accessToken: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Candidato de Teste" },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app)
      .post("/api/v1/identity-resolution/resolve")
      .send({ documento: cpfCadastrado });

    expect(response.status).toBe(401);
  });

  it("encontra a pessoa cadastrada com confiança máxima (MATCH)", async () => {
    const response = await request(container.app)
      .post("/api/v1/identity-resolution/resolve")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ documento: cpfCadastrado });

    expect(response.status).toBe(200);
    expect(response.body.matches).toHaveLength(1);
    expect(response.body.matches[0].decision).toBe("MATCH");
    expect(response.body.matches[0].confidenceScore).toBe(1);
    expect(response.body.matches[0].nivelConfianca).toBe("ALTA");
    expect(response.body.matches[0].signals).toHaveLength(1);
  });

  it("devolve lista vazia quando o documento não está cadastrado", async () => {
    const response = await request(container.app)
      .post("/api/v1/identity-resolution/resolve")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ documento: "11222333000181" });

    expect(response.status).toBe(200);
    expect(response.body.matches).toEqual([]);
  });

  it("rejeita corpo de requisição inválido", async () => {
    const response = await request(container.app)
      .post("/api/v1/identity-resolution/resolve")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
  });
});
