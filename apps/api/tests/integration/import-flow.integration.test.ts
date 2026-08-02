import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import * as XLSX from "xlsx";
import { buildContainer } from "../../src/container/index.js";

function buildSyntheticPgfnWorkbook(documento: string, nome: string): Buffer {
  const rows = [
    ["Lista de Devedores"],
    ["Natureza da dívida: Débito Não Tributário"],
    [],
    ["CPF/CNPJ", "Nome", "Nome Fantasia", "Valor Total", "Valor da Dívida Selecionada"],
    [documento, nome, undefined, "1500.00", "1500.00"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Lista de Devedores");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Usa uma planilha sintética (nunca a planilha real do cliente) que
 * reproduz a estrutura do export PGFN, com um CPF cujos dígitos visíveis
 * mascarados batem com uma Pessoa já cadastrada — prova o fluxo completo
 * upload → resolução de identidade → dossiê automático → dashboard →
 * relatório (ver ADR 0019).
 */
describe("Importação PGFN", () => {
  const container = buildContainer();
  const userEmail = `import-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const cpfCadastrado = "71428539646";
  const nomeCadastrado = "Devedor de Teste da Importação";
  const documentoMascarado = "***.285.396-**";
  let accessToken: string;
  let pessoaId: string;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });
    await container.prisma.user.create({
      data: { id: randomUUID(), email: userEmail, passwordHash, roles: ["ANALYST"] },
    });
    const pessoa = await container.prisma.pessoa.create({
      data: { id: randomUUID(), cpf: cpfCadastrado, nome: nomeCadastrado },
    });
    pessoaId = pessoa.id;

    const loginResponse = await request(container.app)
      .post("/api/v1/auth/login")
      .send({ email: userEmail, password: userPassword });
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await container.prisma.importRow.deleteMany({ where: { pessoaId } });
    await container.prisma.importBatch.deleteMany({
      where: { nomeArquivo: "sintetico-import-flow.xlsx" },
    });
    await container.prisma.dossie.deleteMany({ where: { subjectId: pessoaId } });
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    await container.prisma.pessoa.deleteMany({ where: { cpf: cpfCadastrado } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação para importar", async () => {
    const response = await request(container.app)
      .post("/api/v1/imports")
      .attach(
        "file",
        buildSyntheticPgfnWorkbook(documentoMascarado, nomeCadastrado),
        "sintetico-import-flow.xlsx",
      );

    expect(response.status).toBe(401);
  });

  it("rejeita requisição sem arquivo", async () => {
    const response = await request(container.app)
      .post("/api/v1/imports")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  let importBatchId: string;

  it("importa a planilha, resolve a identidade e cria o dossiê automaticamente", async () => {
    const response = await request(container.app)
      .post("/api/v1/imports")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach(
        "file",
        buildSyntheticPgfnWorkbook(documentoMascarado, nomeCadastrado),
        "sintetico-import-flow.xlsx",
      );

    expect(response.status).toBe(201);
    expect(response.body.totalLinhas).toBe(1);
    expect(response.body.contagens.importadas).toBe(1);
    expect(response.body.resolucaoDeIdentidade).toEqual({
      totalProcessadas: 1,
      totalResolvidas: 1,
      totalSemCorrespondencia: 0,
    });
    importBatchId = response.body.importBatchId;
  });

  it("consulta o dashboard do lote com o dossiê já resolvido", async () => {
    const response = await request(container.app)
      .get(`/api/v1/imports/${importBatchId}/dashboard`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.quantidadeClientes).toBe(1);
    expect(response.body.quantidadeResolvidas).toBe(1);
    expect(response.body.quantidadeDossies).toBe(1);
    expect(response.body.quantidadeSemCorrespondencia).toBe(0);
    expect(response.body.quantidadePendente).toBe(0);
  });

  it("consulta o relatório final com o cliente importado", async () => {
    const response = await request(container.app)
      .get(`/api/v1/imports/${importBatchId}/relatorio`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.clientesImportados).toHaveLength(1);
    expect(response.body.clientesImportados[0].nome).toBe(nomeCadastrado);
    expect(response.body.clientesImportados[0].resolutionStatus).toBe("RESOLVIDA");
    expect(response.body.clientesRejeitados).toEqual([]);
    expect(response.body.resumoExecutivo).toContain("1 linhas processadas");
  });

  it("retorna 404 para dashboard de lote inexistente", async () => {
    const response = await request(container.app)
      .get(`/api/v1/imports/${randomUUID()}/dashboard`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });
});
