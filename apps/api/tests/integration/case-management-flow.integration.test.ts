import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Case Management", () => {
  const container = buildContainer();
  const userEmail = `case-management-test-${randomUUID()}@example.com`;
  const viewerEmail = `case-management-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "53197246837";
  let accessToken: string;
  let viewerAccessToken: string;
  let userId: string;
  let pessoaId: string;
  let dossieId: string;
  let caseId: string;

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
    userId = loginResponse.body.user.id;

    const viewerLoginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: viewerEmail, password: userPassword });
    viewerAccessToken = viewerLoginResponse.body.accessToken;

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito do Case" });
    pessoaId = pessoaResponse.body.id;

    const dossieResponse = await request(container.app)
      .post("/api/v1/dossies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ subjectType: "PESSOA", subjectId: pessoaId });
    dossieId = dossieResponse.body.id;
  });

  afterAll(async () => {
    if (caseId) {
      await container.prisma.caseHistoryEntry.deleteMany({ where: { caseId } });
      await container.prisma.caseNote.deleteMany({ where: { caseId } });
      await container.prisma.case.deleteMany({ where: { id: caseId } });
    }
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
    const response = await request(container.app).post("/api/v1/cases").send({ dossieId });
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão case:write (RBAC, ADR 0029)", async () => {
    const response = await request(container.app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${viewerAccessToken}`)
      .send({ dossieId });
    expect(response.status).toBe(403);
  });

  it("cria um case, avança o status, adiciona uma nota e consulta o detalhe com timeline", async () => {
    const createResponse = await request(container.app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dossieId, priority: "ALTA" });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.status).toBe("ABERTO");
    caseId = createResponse.body.id;

    const statusResponse = await request(container.app)
      .patch(`/api/v1/cases/${caseId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "EM_ANDAMENTO" });
    expect(statusResponse.status).toBe(204);

    const detailsResponse = await request(container.app)
      .patch(`/api/v1/cases/${caseId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ownerId: userId, tags: ["vip"], proximaAcao: "Ligar em 3 dias" });
    expect(detailsResponse.status).toBe(204);

    const noteResponse = await request(container.app)
      .post(`/api/v1/cases/${caseId}/notes`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ texto: "Cliente solicitou prazo adicional" });
    expect(noteResponse.status).toBe(201);

    const detailResponse = await request(container.app)
      .get(`/api/v1/cases/${caseId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.status).toBe("EM_ANDAMENTO");
    expect(detailResponse.body.ownerId).toBe(userId);
    expect(detailResponse.body.tags).toEqual(["vip"]);
    expect(detailResponse.body.notas).toHaveLength(1);
    expect(detailResponse.body.timeline.map((e: { tipo: string }) => e.tipo)).toEqual(
      expect.arrayContaining([
        "CASO_CRIADO",
        "STATUS_ALTERADO",
        "OWNER_ALTERADO",
        "TAGS_ALTERADAS",
        "PROXIMA_ACAO_DEFINIDA",
        "NOTA_ADICIONADA",
      ]),
    );
  });

  it("rejeita uma transição de status inválida", async () => {
    const response = await request(container.app)
      .patch(`/api/v1/cases/${caseId}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "ABERTO" });

    expect(response.status).toBe(400);
  });

  it("lista cases filtrando por status", async () => {
    const response = await request(container.app)
      .get("/api/v1/cases")
      .query({ status: "EM_ANDAMENTO", dossieId })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.some((c: { id: string }) => c.id === caseId)).toBe(true);
  });

  it("rejeita a criação de case para um dossiê inexistente", async () => {
    const response = await request(container.app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ dossieId: randomUUID() });

    expect(response.status).toBe(400);
  });
});
