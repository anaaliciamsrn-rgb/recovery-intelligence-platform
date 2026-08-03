import { ImportBatch, type ImportBatchCounts } from "../../domain/entities/ImportBatch.js";
import { ImportRow } from "../../domain/entities/ImportRow.js";
import {
  DocumentoMascarado,
  InvalidDocumentoMascaradoError,
} from "../../domain/value-objects/DocumentoMascarado.js";
import { ImportResolutionStatus } from "../../domain/value-objects/ImportResolutionStatus.js";
import { ImportRowStatus } from "../../domain/value-objects/ImportRowStatus.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { IImportSourceParser, ParsedImportRow } from "../ports/IImportSourceParser.js";

export interface ImportPgfnSpreadsheetInput {
  fileBuffer: Buffer;
  nomeArquivo: string;
  iniciadoPorUsuarioId?: string | null;
}

export interface ImportPgfnSpreadsheetOutput {
  importBatchId: string;
  totalLinhas: number;
  contagens: ImportBatchCounts;
}

const STATUS_PARA_CONTAGEM: Record<string, keyof ImportBatchCounts> = {
  [ImportRowStatus.IMPORTADA]: "importadas",
  [ImportRowStatus.IGNORADA]: "ignoradas",
  [ImportRowStatus.INVALIDA]: "invalidas",
  [ImportRowStatus.DUPLICADA]: "duplicadas",
  [ImportRowStatus.ERRO]: "erros",
};

/**
 * Orquestra o pipeline completo de uma linha: valida campos obrigatórios,
 * normaliza, valida o formato do documento mascarado, faz parsing dos
 * valores monetários, detecta duplicidade (dentro do lote e contra lotes
 * anteriores), e persiste. Uma linha que falha em qualquer etapa não
 * interrompe as demais — o requisito explícito era "continuar importando
 * mesmo quando algumas linhas falharem". Nenhuma `Pessoa`/`Dossiê` é criada
 * aqui — isso é responsabilidade de `ResolveImportRowIdentityUseCase`,
 * chamado depois, separadamente. Ver ADR 0019.
 */
export class ImportPgfnSpreadsheetUseCase {
  constructor(
    private readonly parser: IImportSourceParser,
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly importRowRepository: IImportRowRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: ImportPgfnSpreadsheetInput): Promise<ImportPgfnSpreadsheetOutput> {
    const parsed = this.parser.parse(input.fileBuffer);
    const now = this.clock.now();

    const batch = ImportBatch.iniciar({
      id: this.idGenerator.generateId(),
      fonte: parsed.fonte,
      nomeArquivo: input.nomeArquivo,
      totalLinhas: parsed.rows.length,
      now,
      iniciadoPorUsuarioId: input.iniciadoPorUsuarioId ?? null,
    });

    const documentosVistosNoLote = new Set<string>();
    const rows: ImportRow[] = [];

    for (const parsedRow of parsed.rows) {
      const row = await this.processarLinha(batch.id, parsedRow, documentosVistosNoLote, now);
      rows.push(row);
      batch.registrarContagem(STATUS_PARA_CONTAGEM[row.status] ?? "erros");
    }

    batch.finalizar(this.clock.now());

    await this.importBatchRepository.save(batch);
    await this.importRowRepository.saveMany(rows);

    return { importBatchId: batch.id, totalLinhas: batch.totalLinhas, contagens: batch.contagens };
  }

  private async processarLinha(
    importBatchId: string,
    parsedRow: ParsedImportRow,
    documentosVistosNoLote: Set<string>,
    now: Date,
  ): Promise<ImportRow> {
    const base = {
      id: this.idGenerator.generateId(),
      importBatchId,
      numeroLinha: parsedRow.numeroLinha,
      resolutionStatus: ImportResolutionStatus.PENDENTE,
      pessoaId: null,
      dossieId: null,
      nomeFantasia: this.normalizarTexto(parsedRow.nomeFantasia),
      naturezaDivida: this.normalizarTexto(parsedRow.naturezaDivida),
      createdAt: now,
    };

    const todosOsCamposVazios =
      !parsedRow.documento &&
      !parsedRow.nome &&
      !parsedRow.valorTotal &&
      !parsedRow.valorDividaSelecionada;
    if (todosOsCamposVazios) {
      return ImportRow.create({
        ...base,
        status: ImportRowStatus.IGNORADA,
        documentoMascarado: null,
        nome: null,
        valorTotal: null,
        valorDividaSelecionada: null,
        motivo: "Linha completamente vazia",
      });
    }

    const nome = this.normalizarTexto(parsedRow.nome);
    if (!nome || !parsedRow.documento) {
      return ImportRow.create({
        ...base,
        status: ImportRowStatus.INVALIDA,
        documentoMascarado: parsedRow.documento,
        nome,
        valorTotal: null,
        valorDividaSelecionada: null,
        motivo: !nome ? "Campo obrigatório ausente: Nome" : "Campo obrigatório ausente: CPF/CNPJ",
      });
    }

    let documento: DocumentoMascarado;
    try {
      documento = DocumentoMascarado.create(parsedRow.documento);
    } catch (error) {
      if (error instanceof InvalidDocumentoMascaradoError) {
        return ImportRow.create({
          ...base,
          status: ImportRowStatus.INVALIDA,
          documentoMascarado: parsedRow.documento,
          nome,
          valorTotal: null,
          valorDividaSelecionada: null,
          motivo: "CPF/CNPJ em formato inesperado (não corresponde ao mascaramento conhecido)",
        });
      }
      throw error;
    }

    let valorTotal: number | null;
    let valorDividaSelecionada: number | null;
    try {
      valorTotal = this.parseValor(parsedRow.valorTotal);
      valorDividaSelecionada = this.parseValor(parsedRow.valorDividaSelecionada);
    } catch {
      return ImportRow.create({
        ...base,
        status: ImportRowStatus.ERRO,
        documentoMascarado: documento.toString(),
        nome,
        valorTotal: null,
        valorDividaSelecionada: null,
        motivo: "Valor monetário não numérico",
      });
    }

    if (documentosVistosNoLote.has(documento.toString())) {
      return ImportRow.create({
        ...base,
        status: ImportRowStatus.DUPLICADA,
        documentoMascarado: documento.toString(),
        nome,
        valorTotal,
        valorDividaSelecionada,
        motivo: "Documento já aparece em outra linha deste mesmo lote",
      });
    }

    const duplicadasEmLotesAnteriores = await this.importRowRepository.findByDocumentoMascarado(
      documento.toString(),
    );
    const jaImportadoAntes = duplicadasEmLotesAnteriores.some(
      (row) => row.status === ImportRowStatus.IMPORTADA,
    );
    if (jaImportadoAntes) {
      return ImportRow.create({
        ...base,
        status: ImportRowStatus.DUPLICADA,
        documentoMascarado: documento.toString(),
        nome,
        valorTotal,
        valorDividaSelecionada,
        motivo: "Documento já importado em um lote anterior",
      });
    }

    documentosVistosNoLote.add(documento.toString());

    return ImportRow.create({
      ...base,
      status: ImportRowStatus.IMPORTADA,
      documentoMascarado: documento.toString(),
      nome,
      valorTotal,
      valorDividaSelecionada,
      motivo: null,
    });
  }

  private normalizarTexto(value: string | null): string | null {
    if (!value) return null;
    const normalizado = value.trim().replace(/\s+/g, " ");
    return normalizado.length > 0 ? normalizado : null;
  }

  private parseValor(value: string | null): number | null {
    if (value === null) return null;
    const normalizado = value.trim();
    if (normalizado.length === 0) return null;

    const numero = Number(normalizado);
    if (Number.isNaN(numero)) {
      throw new Error(`Valor monetário não numérico: ${value}`);
    }
    return numero;
  }
}
