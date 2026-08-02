import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Nenhum handler de negócio está registrado (ver ADR 0032) — por isso o
 * cenário de sucesso aqui prova a fila-morta (nenhum handler => falha =>
 * MORTO em maxTentativas=1), não uma execução bem-sucedida de fato.
 */
describe("Scheduler", () => {
  const container = buildContainer();
  const userEmail = `scheduler-test-${randomUUID()}@example.com`;
  const viewerEmail = `scheduler-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  let accessToken: string;
  let viewerAccessToken: string;
  let scheduledJobId: string;

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
    if (scheduledJobId) {
      await container.prisma.jobExecutionEntry.deleteMany({ where: { scheduledJobId } });
      await container.prisma.scheduledJob.deleteMany({ where: { id: scheduledJobId } });
    }
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).post("/api/v1/scheduler/jobs").send({});
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão scheduler:write (RBAC, ADR 0029/0032)", async () => {
    const response = await request(container.app)
      .post("/api/v1/scheduler/jobs")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({ nome: "x", tipo: "x", agendadoPara: new Date().toISOString() });
    expect(response.status).toBe(403);
  });

  it("agenda um job para o passado (já devido) com maxTentativas=1", async () => {
    const response = await request(container.app)
      .post("/api/v1/scheduler/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        nome: "Job de teste sem handler",
        tipo: `tipo-inexistente-${randomUUID().slice(0, 8)}`,
        payload: { origem: "integration-test" },
        agendadoPara: new Date(Date.now() - 60_000).toISOString(),
        maxTentativas: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("PENDENTE");
    expect(response.body.tentativas).toBe(0);
    scheduledJobId = response.body.id;
  });

  it("processa o job devido e, sem handler registrado, vai para MORTO (fila-morta) na 1ª tentativa", async () => {
    const runResponse = await request(container.app)
      .post("/api/v1/scheduler/jobs/run-due")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(runResponse.status).toBe(200);
    expect(runResponse.body.executados).toBeGreaterThanOrEqual(1);
    expect(runResponse.body.mortos).toBeGreaterThanOrEqual(1);

    const detalhe = await request(container.app)
      .get(`/api/v1/scheduler/jobs/${scheduledJobId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.status).toBe("MORTO");
    expect(detalhe.body.tentativas).toBe(1);
    expect(detalhe.body.ultimoErro).toContain("Nenhum handler registrado");
    expect(detalhe.body.execucoes).toHaveLength(1);
    expect(detalhe.body.execucoes[0].status).toBe("FALHA");
  });

  it("não reprocessa um job MORTO em uma segunda chamada de run-due", async () => {
    const antes = await request(container.app)
      .get(`/api/v1/scheduler/jobs/${scheduledJobId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    await request(container.app)
      .post("/api/v1/scheduler/jobs/run-due")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    const depois = await request(container.app)
      .get(`/api/v1/scheduler/jobs/${scheduledJobId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(depois.body.tentativas).toBe(antes.body.tentativas);
    expect(depois.body.execucoes).toHaveLength(1);
  });

  it("lista jobs filtrando por status", async () => {
    const response = await request(container.app)
      .get("/api/v1/scheduler/jobs")
      .query({ status: "MORTO" })
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.items.some((j: { id: string }) => j.id === scheduledJobId)).toBe(true);
  });

  it("retorna 404 para um job inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/scheduler/jobs/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(404);
  });

  it("rejeita a criação de um job com tipo vazio", async () => {
    const response = await request(container.app)
      .post("/api/v1/scheduler/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "x", tipo: "", agendadoPara: new Date().toISOString() });
    expect(response.status).toBe(400);
  });
});
