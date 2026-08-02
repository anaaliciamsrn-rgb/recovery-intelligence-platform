import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Workflow Engine", () => {
  const container = buildContainer();
  const userEmail = `workflow-test-${randomUUID()}@example.com`;
  const viewerEmail = `workflow-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  let accessToken: string;
  let viewerAccessToken: string;
  let workflowDefinitionId: string;
  let workflowInstanceId: string;

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
    if (workflowInstanceId) {
      await container.prisma.workflowInstanceHistoryEntry.deleteMany({
        where: { workflowInstanceId },
      });
      await container.prisma.workflowInstance.deleteMany({ where: { id: workflowInstanceId } });
    }
    if (workflowDefinitionId) {
      await container.prisma.workflowTransitionRecord.deleteMany({
        where: { workflowDefinitionId },
      });
      await container.prisma.workflowDefinition.deleteMany({ where: { id: workflowDefinitionId } });
    }
    await container.prisma.user.deleteMany({ where: { email: { in: [userEmail, viewerEmail] } } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação", async () => {
    const response = await request(container.app).post("/api/v1/workflows").send({});
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão workflow:write (RBAC, ADR 0029)", async () => {
    const response = await request(container.app)
      .post("/api/v1/workflows")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({});
    expect(response.status).toBe(403);
  });

  it("cria um fluxo configurável inteiramente por dados, sem nenhum código novo", async () => {
    const response = await request(container.app)
      .post("/api/v1/workflows")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        nome: "Cobrança padrão (teste)",
        estados: ["NOVO", "EM_CONTATO", "RESOLVIDO"],
        estadoInicial: "NOVO",
        transicoes: [
          { de: "NOVO", para: "EM_CONTATO", gatilho: "CONTATO", acao: "NOTIFICAR" },
          {
            de: "EM_CONTATO",
            para: "RESOLVIDO",
            gatilho: "PAGAMENTO",
            condicao: { campo: "valor", operador: "MENOR_QUE", valor: 1000 },
            acao: "ENCERRAR_CASE",
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.estados).toEqual(["NOVO", "EM_CONTATO", "RESOLVIDO"]);
    expect(response.body.transicoes).toHaveLength(2);
    workflowDefinitionId = response.body.id;
  });

  it("inicia uma instância no estado inicial", async () => {
    const response = await request(container.app)
      .post(`/api/v1/workflows/${workflowDefinitionId}/instances`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ referenciaId: randomUUID() });

    expect(response.status).toBe(201);
    expect(response.body.estadoAtual).toBe("NOVO");
    workflowInstanceId = response.body.id;
  });

  it("dispara uma transição condicional e registra na timeline", async () => {
    await request(container.app)
      .post(`/api/v1/workflow-instances/${workflowInstanceId}/trigger`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gatilho: "CONTATO" });

    const response = await request(container.app)
      .post(`/api/v1/workflow-instances/${workflowInstanceId}/trigger`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gatilho: "PAGAMENTO", contexto: { valor: 500 } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      estadoAnterior: "EM_CONTATO",
      estadoNovo: "RESOLVIDO",
      acao: "ENCERRAR_CASE",
    });

    const detalhe = await request(container.app)
      .get(`/api/v1/workflow-instances/${workflowInstanceId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detalhe.body.estadoAtual).toBe("RESOLVIDO");
    expect(detalhe.body.historico).toHaveLength(2);
  });

  it("rejeita um gatilho sem transição aplicável", async () => {
    const response = await request(container.app)
      .post(`/api/v1/workflow-instances/${workflowInstanceId}/trigger`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gatilho: "CONTATO" });

    expect(response.status).toBe(400);
  });

  it("rejeita transição cuja condição não é satisfeita", async () => {
    const startResponse = await request(container.app)
      .post(`/api/v1/workflows/${workflowDefinitionId}/instances`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ referenciaId: randomUUID() });
    const outraInstanciaId = startResponse.body.id;

    await request(container.app)
      .post(`/api/v1/workflow-instances/${outraInstanciaId}/trigger`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gatilho: "CONTATO" });

    const response = await request(container.app)
      .post(`/api/v1/workflow-instances/${outraInstanciaId}/trigger`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gatilho: "PAGAMENTO", contexto: { valor: 5000 } });

    expect(response.status).toBe(400);

    await container.prisma.workflowInstanceHistoryEntry.deleteMany({
      where: { workflowInstanceId: outraInstanciaId },
    });
    await container.prisma.workflowInstance.deleteMany({ where: { id: outraInstanciaId } });
  });
});
