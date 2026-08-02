import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import { buildContainer } from "../../src/container/index.js";

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo):
 *   docker compose up -d postgres redis
 *
 * O token de acesso é obtido via login real (não fabricado) — mesmo padrão
 * de tests/integration/identity-auth-flow.integration.test.ts.
 */
describe("Cadastro/consulta de Pessoa e Empresa", () => {
  const container = buildContainer();
  const userEmail = `party-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const validCpf = "529.982.247-25";
  const validCnpj = "11.222.333/0001-81";
  let accessToken: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.participacaoSocietaria.deleteMany({
      where: { pessoa: { cpf: "11144477735" } },
    });
    await container.prisma.pessoa.deleteMany({
      where: { cpf: { in: ["52998224725", "11144477735"] } },
    });
    await container.prisma.empresa.deleteMany({
      where: { cnpj: { in: ["11222333000181", "11444777000161"] } },
    });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  describe("Pessoa", () => {
    it("exige autenticação para cadastrar", async () => {
      const response = await request(container.app)
        .post("/api/v1/pessoas")
        .send({ cpf: validCpf, nome: "X" });
      expect(response.status).toBe(401);
    });

    it("cadastra uma pessoa com CPF válido", async () => {
      const response = await request(container.app)
        .post("/api/v1/pessoas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cpf: validCpf, nome: "Ana Alícia" });

      expect(response.status).toBe(201);
      expect(response.body.cpf).toBe("52998224725");
      expect(response.body.nome).toBe("Ana Alícia");
    });

    it("consulta a pessoa cadastrada por CPF", async () => {
      const response = await request(container.app)
        .get("/api/v1/pessoas/52998224725")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.nome).toBe("Ana Alícia");
    });

    it("rejeita cadastro duplicado do mesmo CPF com 409", async () => {
      const response = await request(container.app)
        .post("/api/v1/pessoas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cpf: validCpf, nome: "Outra Pessoa" });

      expect(response.status).toBe(409);
    });

    it("rejeita CPF malformado com 400", async () => {
      const response = await request(container.app)
        .post("/api/v1/pessoas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cpf: "123", nome: "Pessoa Inválida" });

      expect(response.status).toBe(400);
    });

    it("retorna 404 para CPF não cadastrado", async () => {
      const response = await request(container.app)
        .get("/api/v1/pessoas/11144477735")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Empresa", () => {
    it("exige autenticação para cadastrar", async () => {
      const response = await request(container.app)
        .post("/api/v1/empresas")
        .send({ cnpj: validCnpj, razaoSocial: "X" });
      expect(response.status).toBe(401);
    });

    it("cadastra uma empresa com CNPJ válido", async () => {
      const response = await request(container.app)
        .post("/api/v1/empresas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cnpj: validCnpj, razaoSocial: "Recovery Intelligence Ltda" });

      expect(response.status).toBe(201);
      expect(response.body.cnpj).toBe("11222333000181");
      expect(response.body.razaoSocial).toBe("Recovery Intelligence Ltda");
    });

    it("consulta a empresa cadastrada por CNPJ", async () => {
      const response = await request(container.app)
        .get("/api/v1/empresas/11222333000181")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.razaoSocial).toBe("Recovery Intelligence Ltda");
    });

    it("rejeita cadastro duplicado do mesmo CNPJ com 409", async () => {
      const response = await request(container.app)
        .post("/api/v1/empresas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cnpj: validCnpj, razaoSocial: "Outra Empresa Ltda" });

      expect(response.status).toBe(409);
    });

    it("rejeita CNPJ malformado com 400", async () => {
      const response = await request(container.app)
        .post("/api/v1/empresas")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ cnpj: "123", razaoSocial: "Empresa Inválida" });

      expect(response.status).toBe(400);
    });

    it("retorna 404 para CNPJ não cadastrado", async () => {
      const response = await request(container.app)
        .get("/api/v1/empresas/11444777000161")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Participação Societária (Pessoa ↔ Empresa)", () => {
    let pessoaId: string;
    let empresaId: string;

    beforeAll(async () => {
      const pessoa = await container.prisma.pessoa.create({
        data: { id: randomUUID(), cpf: "11144477735", nome: "Sócio de Teste" },
      });
      pessoaId = pessoa.id;

      const empresa = await container.prisma.empresa.create({
        data: { id: randomUUID(), cnpj: "11444777000161", razaoSocial: "Empresa Vinculada Ltda" },
      });
      empresaId = empresa.id;
    });

    it("exige autenticação para registrar", async () => {
      const response = await request(container.app)
        .post("/api/v1/participacoes-societarias")
        .send({ pessoaId, empresaId, papel: "SOCIO" });
      expect(response.status).toBe(401);
    });

    it("rejeita pessoaId inexistente com 400", async () => {
      const response = await request(container.app)
        .post("/api/v1/participacoes-societarias")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ pessoaId: randomUUID(), empresaId, papel: "SOCIO" });

      expect(response.status).toBe(400);
    });

    it("registra a participação societária", async () => {
      const response = await request(container.app)
        .post("/api/v1/participacoes-societarias")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ pessoaId, empresaId, papel: "SOCIO_ADMINISTRADOR", percentualParticipacao: 75 });

      expect(response.status).toBe(201);
      expect(response.body.pessoaId).toBe(pessoaId);
      expect(response.body.empresaId).toBe(empresaId);
      expect(response.body.percentualParticipacao).toBe(75);
    });

    it("lista as participações da empresa", async () => {
      const response = await request(container.app)
        .get(`/api/v1/participacoes-societarias?empresaId=${empresaId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.participacoes).toHaveLength(1);
      expect(response.body.participacoes[0].pessoaId).toBe(pessoaId);
    });

    it("lista as participações da pessoa", async () => {
      const response = await request(container.app)
        .get(`/api/v1/participacoes-societarias?pessoaId=${pessoaId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.participacoes).toHaveLength(1);
      expect(response.body.participacoes[0].empresaId).toBe(empresaId);
    });

    it("rejeita listagem sem filtro ou com os dois filtros ao mesmo tempo", async () => {
      const noFilter = await request(container.app)
        .get("/api/v1/participacoes-societarias")
        .set("Authorization", `Bearer ${accessToken}`);
      expect(noFilter.status).toBe(400);

      const bothFilters = await request(container.app)
        .get(`/api/v1/participacoes-societarias?pessoaId=${pessoaId}&empresaId=${empresaId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(bothFilters.status).toBe(400);
    });

    it("encerra a participação e ela deixa de aparecer como ativa", async () => {
      const listBefore = await request(container.app)
        .get(`/api/v1/participacoes-societarias?empresaId=${empresaId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      const participacaoId = listBefore.body.participacoes[0].id;

      const encerrarResponse = await request(container.app)
        .post(`/api/v1/participacoes-societarias/${participacaoId}/encerrar`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});
      expect(encerrarResponse.status).toBe(204);

      const listAfter = await request(container.app)
        .get(`/api/v1/participacoes-societarias?empresaId=${empresaId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(listAfter.body.participacoes[0].dataSaida).not.toBeNull();
    });
  });
});
