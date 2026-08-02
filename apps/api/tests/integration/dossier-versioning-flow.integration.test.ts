import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Exercita o fluxo real (criar Pessoa → criar Dossiê → registrar duas
 * evidências) e verifica que o middleware de versionamento (ver ADR 0022)
 * criou uma versão imutável por ação, consultável pelos três endpoints de
 * leitura — sem nenhuma alteração no módulo `dossie`.
 */
describe("Dossier Versioning", () => {
  const container = buildContainer();
  const userEmail = `dossier-versioning-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "18573926473";
  let accessToken: string;
  let userId: string;
  let pessoaId: string;
  let dossieId: string;

  // O middleware grava a versão de forma assíncrona, sem bloquear a
  // resposta (fire-and-forget, de propósito — ver ADR 0022).
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito Versionado" });
    pessoaId = pessoaResponse.body.id;

    const dossieResponse = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    dossieId = dossieResponse.body.id;
    await wait(80);

    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: { temPendencia: true },
        confidenceScore: 0.9,
      });
    await wait(80);

    await request(container.app)
      .post(`/api/v1/dossies/${dossieId}/evidencias`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fonte: "RECEITA_FEDERAL",
        status: "ENCONTRADO",
        valor: { situacaoCadastral: "ATIVA" },
        confidenceScore: 0.85,
      });
    await wait(80);
  });

  afterAll(async () => {
    await container.prisma.versionSnapshot.deleteMany({ where: { dossieId } });
    await container.prisma.auditEvent.deleteMany({ where: { usuarioId: userId } });
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação em todos os endpoints de leitura", async () => {
    const respostas = await Promise.all([
      request(container.app).get(`/api/v1/dossiers/${dossieId}/history`),
      request(container.app).get(`/api/v1/dossiers/${dossieId}/history/1`),
      request(container.app).get(`/api/v1/dossiers/${dossieId}/diff/1/2`),
    ]);

    for (const resposta of respostas) expect(resposta.status).toBe(401);
  });

  it("criou três versões — criação do dossiê e as duas atualizações de evidência", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossiers/${dossieId}/history`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { versao: number }) => item.versao)).toEqual([1, 2, 3]);
    expect(response.body.items[0].resumoMudancas).toEqual([]);
    expect(response.body.items[1].resumoMudancas).toEqual(
      expect.arrayContaining([
        "Evidência PGFN adicionada",
        "Classificação de risco mudou de BAIXO_RISCO para ALTO_RISCO",
      ]),
    );
    expect(response.body.items[2].resumoMudancas).toEqual(
      expect.arrayContaining(["Evidência Receita Federal adicionada"]),
    );
  });

  it("consulta o snapshot completo de uma versão específica", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossiers/${dossieId}/history/2`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.dossieId).toBe(dossieId);
    expect(response.body.versao).toBe(2);
    expect(response.body.classificacao).toBe("ALTO_RISCO");
    expect(response.body.evidencias.pgfn.status).toBe("ENCONTRADO");
    expect(response.body.evidencias.pgfn.valor).toEqual({ temPendencia: true });
    expect(response.body.evidencias.receitaFederal.status).toBe("NAO_CONSULTADO");
    expect(typeof response.body.prompt.texto).toBe("string");
    expect(response.body.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("retorna 404 para uma versão inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossiers/${dossieId}/history/99`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it("compara duas versões e identifica exatamente o que mudou", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossiers/${dossieId}/diff/1/2`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.evidencias).toEqual(
      expect.arrayContaining([{ fonte: "pgfn", tipo: "ADICIONADA" }]),
    );
    expect(response.body.classificacao).toEqual({
      anterior: "BAIXO_RISCO",
      atual: "ALTO_RISCO",
      mudou: true,
    });
    expect(response.body.riskScore.mudou).toBe(true);
  });

  it("rejeita um parâmetro de versão inválido", async () => {
    const response = await request(container.app)
      .get(`/api/v1/dossiers/${dossieId}/history/abc`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });
});
