import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Explainability Engine", () => {
  const container = buildContainer();
  const userEmail = `explainability-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  // CPF distinto de outros arquivos de integration test — ver ADR 0015.
  const cpfCadastrado = "48261937500";
  let accessToken: string;
  let pessoaId: string;
  let dossieId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: "Sujeito Explicado" },
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
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.9,
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
    const response = await request(container.app).get(
      `/api/v1/classification/${dossieId}/explanation`,
    );
    expect(response.status).toBe(401);
  });

  it("explica a classificação com fator ligado à evidência real e timeline completa", async () => {
    const response = await request(container.app)
      .get(`/api/v1/classification/${dossieId}/explanation`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.dossieId).toBe(dossieId);
    expect(response.body.score.classe).toBe("ALTO_RISCO");
    expect(response.body.score.final).toBe(1);

    expect(response.body.fatores).toHaveLength(1);
    const fator = response.body.fatores[0];
    expect(fator.nome).toBe("Pendência Fiscal (PGFN)");
    expect(fator.fonte).toBe("PGFN");
    expect(fator.impacto).toBe(0.4);
    expect(fator.evidencia.status).toBe("ENCONTRADO");
    expect(fator.evidencia.valor).toEqual({ temPendencia: true });

    expect(Array.isArray(response.body.recomendacoes)).toBe(true);
    expect(response.body.recomendacoes.length).toBeGreaterThan(0);

    const etapas = response.body.timeline.map((evento: { etapa: string }) => evento.etapa);
    expect(etapas).toEqual([
      "CONSULTA_INICIADA",
      "FONTES_CONSULTADAS",
      "DOSSIE_ATUALIZADO",
      "CLASSIFICACAO_EXECUTADA",
      "RECOMENDACAO_GERADA",
      "PROMPT_CRIADO",
    ]);
    expect(response.body.timeline[0].timestamp).not.toBeNull();
    expect(response.body.timeline[1].timestamp).not.toBeNull();
  });

  it("retorna 404 para dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/classification/${randomUUID()}/explanation`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
