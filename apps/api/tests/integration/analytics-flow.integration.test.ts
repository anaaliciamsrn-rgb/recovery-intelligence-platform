import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * `analytics` agrega dados de toda a plataforma (sem filtro de tenant
 * ainda — ver ADR 0025/0028), então o teste compara o resumo antes/depois
 * de criar seus próprios dados (delta), em vez de valores absolutos —
 * assim ele fica correto mesmo que outras suítes tenham dados no banco.
 */
describe("Analytics Engine", () => {
  const container = buildContainer();
  const userEmail = `analytics-test-${randomUUID()}@example.com`;
  const viewerEmail = `analytics-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "24681357928";
  let accessToken: string;
  let viewerAccessToken: string;
  let pessoaId: string;
  let dossieId: string;

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
    await container.prisma.versionSnapshot.deleteMany({ where: { dossieId } });
    await container.prisma.auditEvent.deleteMany({ where: { entidadeId: pessoaId } });
    await container.prisma.auditEvent.deleteMany({ where: { entidadeId: dossieId } });
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).get("/api/v1/analytics/summary");
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão analytics:read (RBAC, ADR 0029)", async () => {
    const response = await request(container.app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${viewerAccessToken}`);
    expect(response.status).toBe(403);
  });

  it("reflete um novo dossiê classificado no resumo agregado", async () => {
    const antes = await request(container.app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(antes.status).toBe(200);

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito Analisado" });
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

    await new Promise((resolve) => setTimeout(resolve, 100));

    const depois = await request(container.app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(depois.status).toBe(200);
    expect(depois.body.totalPessoas).toBe(antes.body.totalPessoas + 1);
    expect(depois.body.totalDossiesAnalisados).toBe(antes.body.totalDossiesAnalisados + 1);
    const altoRiscoAntes = antes.body.distribuicaoRisco.ALTO_RISCO ?? 0;
    expect(depois.body.distribuicaoRisco.ALTO_RISCO).toBe(altoRiscoAntes + 1);
    expect(
      depois.body.metricasPorFonte.find((m: { fonte: string }) => m.fonte === "pgfn")
        .percentualRespondida,
    ).toBeGreaterThan(0);
  });
});
