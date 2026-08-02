import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import request from "supertest";
import * as XLSX from "xlsx";
import { buildContainer } from "../../src/container/index.js";

function buildSyntheticPgfnWorkbook(
  rows: { documento?: string; nome?: string; valorTotal?: string; nomeFantasia?: string }[],
): Buffer {
  const linhas = [
    ["Lista de Devedores"],
    ["Natureza da dívida: Débito Não Tributário"],
    [],
    ["CPF/CNPJ", "Nome", "Nome Fantasia", "Valor Total", "Valor da Dívida Selecionada"],
    ...rows.map((row) => [
      row.documento,
      row.nome,
      row.nomeFantasia,
      row.valorTotal,
      row.valorTotal,
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Lista de Devedores");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Requer Postgres e Redis rodando (ver docker-compose.yml na raiz do repo).
 * Cobre as extensões Enterprise da Etapa 15 (preview, histórico, rollback —
 * ver ADR 0034), sempre com planilha sintética e documento já mascarado no
 * formato PGFN — nunca um CPF completo (ver ADR 0019 e a restrição de LGPD
 * do lote contínuo).
 */
describe("Import Excel Enterprise", () => {
  const container = buildContainer();
  const userEmail = `import-enterprise-test-${randomUUID()}@example.com`;
  const userPassword = "senha-forte-de-teste-123";
  const documentoMascarado = "***.192.470-**";
  const nomeSintetico = "Devedor Sintético do Preview";
  const nomeArquivo = `sintetico-import-enterprise-${randomUUID().slice(0, 8)}.xlsx`;
  let accessToken: string;
  let importBatchId: string;

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
    if (importBatchId) {
      await container.prisma.importRow.deleteMany({ where: { importBatchId } });
      await container.prisma.importBatch.deleteMany({ where: { id: importBatchId } });
    }
    await container.prisma.user.deleteMany({ where: { email: userEmail } });
    container.processMetricsProvider.dispose();
    container.redis.disconnect();
    await container.prisma.$disconnect();
  });

  it("exige autenticação para o preview", async () => {
    const response = await request(container.app)
      .post("/api/v1/imports/preview")
      .attach(
        "file",
        buildSyntheticPgfnWorkbook([
          { documento: documentoMascarado, nome: nomeSintetico, valorTotal: "100" },
        ]),
        nomeArquivo,
      );
    expect(response.status).toBe(401);
  });

  it("preview nunca cria nenhum lote — só inspeciona e devolve o que aconteceria", async () => {
    const totalBatchesAntes = await container.prisma.importBatch.count();

    const response = await request(container.app)
      .post("/api/v1/imports/preview")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach(
        "file",
        buildSyntheticPgfnWorkbook([
          { documento: documentoMascarado, nome: nomeSintetico, valorTotal: "100" },
          { nome: "Linha sem documento" },
          // Linha "completamente vazia" nos 4 campos que a validação de negócio olha
          // (documento/nome/valorTotal/valorDividaSelecionada) — só ganha um valor em
          // "Nome Fantasia" (campo que a validação ignora) para não ser podada pelo
          // próprio xlsx como linha final em branco (ver XLSX.utils.aoa_to_sheet).
          { nomeFantasia: "-" },
        ]),
        nomeArquivo,
      );

    expect(response.status).toBe(200);
    expect(response.body.totalLinhas).toBe(3);
    expect(response.body.contagens).toEqual({
      importaveis: 1,
      ignoradas: 1,
      invalidas: 1,
      duplicadas: 0,
      erros: 0,
    });
    expect(response.body.linhas).toHaveLength(3);
    expect(response.body.linhas[0]).toMatchObject({
      status: "IMPORTAVEL",
      nome: nomeSintetico,
      documentoMascarado,
    });

    const totalBatchesDepois = await container.prisma.importBatch.count();
    expect(totalBatchesDepois).toBe(totalBatchesAntes);
  });

  it("preview detecta duplicidade contra um lote já importado antes, sem persistir nada novo", async () => {
    const importResponse = await request(container.app)
      .post("/api/v1/imports")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach(
        "file",
        buildSyntheticPgfnWorkbook([
          { documento: documentoMascarado, nome: nomeSintetico, valorTotal: "100" },
        ]),
        nomeArquivo,
      );
    expect(importResponse.status).toBe(201);
    importBatchId = importResponse.body.importBatchId;

    const previewResponse = await request(container.app)
      .post("/api/v1/imports/preview")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach(
        "file",
        buildSyntheticPgfnWorkbook([
          { documento: documentoMascarado, nome: nomeSintetico, valorTotal: "200" },
        ]),
        nomeArquivo,
      );

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.contagens.duplicadas).toBe(1);
    expect(previewResponse.body.linhas[0].motivo).toBe(
      "Documento já importado em um lote anterior",
    );
  });

  it("lista o histórico de importações e inclui o lote recém-criado", async () => {
    const response = await request(container.app)
      .get("/api/v1/imports")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    const lote = response.body.items.find((item: { id: string }) => item.id === importBatchId);
    expect(lote).toBeDefined();
    expect(lote.status).toBe("CONCLUIDO");
    expect(lote.revertidoEm).toBeNull();
  });

  it("rejeita reversão de um lote inexistente", async () => {
    const response = await request(container.app)
      .post(`/api/v1/imports/${randomUUID()}/rollback`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ motivo: "teste" });
    expect(response.status).toBe(404);
  });

  it("reverte o lote — nunca apaga as linhas, só sinaliza REVERTIDO", async () => {
    const rollbackResponse = await request(container.app)
      .post(`/api/v1/imports/${importBatchId}/rollback`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ motivo: "Planilha enviada por engano" });

    expect(rollbackResponse.status).toBe(200);
    expect(rollbackResponse.body.status).toBe("REVERTIDO");
    expect(rollbackResponse.body.motivoReversao).toBe("Planilha enviada por engano");

    const linhasAindaExistem = await container.prisma.importRow.count({ where: { importBatchId } });
    expect(linhasAindaExistem).toBe(1);

    const historico = await request(container.app)
      .get("/api/v1/imports")
      .set("Authorization", `Bearer ${accessToken}`);
    const lote = historico.body.items.find((item: { id: string }) => item.id === importBatchId);
    expect(lote.status).toBe("REVERTIDO");
  });

  it("rejeita reverter o mesmo lote uma segunda vez", async () => {
    const response = await request(container.app)
      .post(`/api/v1/imports/${importBatchId}/rollback`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ motivo: "segunda tentativa" });
    expect(response.status).toBe(409);
  });

  it("rejeita rollback sem motivo", async () => {
    const response = await request(container.app)
      .post(`/api/v1/imports/${importBatchId}/rollback`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(response.status).toBe(400);
  });
});
