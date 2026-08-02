import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/** Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo). */
describe("Confidence Heatmap", () => {
  const container = buildContainer();
  const userEmail = `confidence-heatmap-test-${randomUUID()}@example.com`;
  const viewerEmail = `confidence-heatmap-viewer-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "39715826482";
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

    const pessoaResponse = await request(container.app)
      .post("/api/v1/pessoas")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ cpf: cpfCadastrado, nome: "Sujeito do Heatmap" });
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
    const response = await request(container.app).get(`/api/v1/confidence-heatmap/${dossieId}`);
    expect(response.status).toBe(401);
  });

  it("rejeita um papel sem a permissão confidence-heatmap:read (RBAC, ADR 0029)", async () => {
    const response = await request(container.app)
      .get(`/api/v1/confidence-heatmap/${dossieId}`)
      .set("Authorization", `Bearer ${viewerAccessToken}`);
    expect(response.status).toBe(403);
  });

  it("devolve o heatmap com fonte respondida, fontes ausentes e confiança agregada", async () => {
    const response = await request(container.app)
      .get(`/api/v1/confidence-heatmap/${dossieId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.classificacao).toBe("ALTO_RISCO");
    const pgfn = response.body.fontes.find((f: { fonte: string }) => f.fonte === "PGFN");
    expect(pgfn.status).toBe("ENCONTRADO");
    expect(pgfn.contribuicaoPercentual).toBe(100);
    expect(response.body.fontesAusentes).toHaveLength(4);
    expect(response.body.confiancaAgregada).toBeGreaterThan(0);
  });

  it("retorna 404 para um dossiê inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/confidence-heatmap/${randomUUID()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
