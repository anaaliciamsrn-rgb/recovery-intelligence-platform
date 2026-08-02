import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Dossiê Base", () => {
  const container = buildContainer();
  const userEmail = `dossie-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  // CPF distinto do usado por outros arquivos de integration test (ex.:
  // identity-resolution-flow) — arquivos rodam em paralelo contra o mesmo
  // Postgres; reutilizar o mesmo CPF causa colisão de unique constraint e
  // um teste apagando a Pessoa que o outro depende (bug real encontrado
  // nesta sprint, corrigido aqui).
  const cpfCadastrado = "22233344405";
  let accessToken: string;
  let pessoaId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Sujeito do Dossiê" },
    });
    pessoaId = pessoa.id;

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação para criar", async () => {
    const response = await request(container.app)
      .post("/api/v1/dossies")
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    expect(response.status).toBe(401);
  });

  it("rejeita subjectId de Pessoa inexistente com 400", async () => {
    const response = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: randomUUID() });

    expect(response.status).toBe(400);
  });

  let dossieId: string;

  it("cria um dossiê vazio para a pessoa cadastrada", async () => {
    const response = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });

    expect(response.status).toBe(201);
    expect(response.body.subjectId).toBe(pessoaId);
    dossieId = response.body.id;
  });

  it("consulta o dossiê e todas as evidências vêm NAO_CONSULTADO", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossies/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.evidencias.pgfn.status).toBe("NAO_CONSULTADO");
    expect(response.body.evidencias.dataJud.status).toBe("NAO_CONSULTADO");
    expect(response.body.evidencias.receitaFederal.status).toBe("NAO_CONSULTADO");
    expect(response.body.evidencias.portalTransparencia.status).toBe("NAO_CONSULTADO");
    expect(response.body.evidencias.cenprot.status).toBe("NAO_CONSULTADO");
  });

  it("registra uma evidência ENCONTRADO na fonte RECEITA_FEDERAL", async () => {
    const registrarResponse = await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "RECEITA_FEDERAL",
        status: "ENCONTRADO",
        valor: { situacaoCadastral: "REGULAR" },
        confidenceScore: 0.9,
      });
    expect(registrarResponse.status).toBe(204);

    const getResponse = await request(container.app)
      .get(`/api/v1/dossies/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getResponse.body.evidencias.receitaFederal.status).toBe("ENCONTRADO");
    expect(getResponse.body.evidencias.receitaFederal.valor).toEqual({
      situacaoCadastral: "REGULAR",
    });
    expect(getResponse.body.evidencias.receitaFederal.confidenceScore).toBe(0.9);
    expect(getResponse.body.evidencias.pgfn.status).toBe("NAO_CONSULTADO");
  });

  it("retorna 404 para dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossies/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
