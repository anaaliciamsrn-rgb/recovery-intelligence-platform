import {
  DocumentoMascarado,
  InvalidDocumentoMascaradoError,
} from "../../domain/value-objects/DocumentoMascarado.js";
import { ImportPreviewRowStatus } from "../../domain/value-objects/ImportPreviewRowStatus.js";
import { ImportRowStatus } from "../../domain/value-objects/ImportRowStatus.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";
import type { IImportSourceParser, ParsedImportRow } from "../ports/IImportSourceParser.js";

export interface PreviewImportSpreadsheetInput {
  fileBuffer: Buffer;
}

export interface ImportPreviewRow {
  numeroLinha: number;
  nome: string | null;
  documentoMascarado: string | null;
  status: ImportPreviewRowStatus;
  motivo: string | null;
}

export interface ImportPreviewCounts {
  importaveis: number;
  ignoradas: number;
  invalidas: number;
  duplicadas: number;
  erros: number;
}

export interface PreviewImportSpreadsheetOutput {
  fonte: string;
  totalLinhas: number;
  contagens: ImportPreviewCounts;
  linhas: ImportPreviewRow[];
}

/**
 * Faz o parsing e roda exatamente as mesmas validações de
 * `ImportPgfnSpreadsheetUseCase` (campos obrigatórios, formato do
 * documento mascarado, valores monetários, duplicidade — em lote e contra
 * lotes anteriores), mas **nunca persiste nada**: nenhum `ImportBatch`/
 * `ImportRow` é criado. Implementação independente (não reaproveita os
 * métodos privados do use case aprovado) — mesmo padrão de duplicação
 * deliberada já usado no restante da plataforma. Ver ADR 0034.
 */
export class PreviewImportSpreadsheetUseCase {
  constructor(
    private readonly parser: IImportSourceParser,
    private readonly importRowRepository: IImportRowRepository,
  ) {}

  async execute(input: PreviewImportSpreadsheetInput): Promise<PreviewImportSpreadsheetOutput> {
    const parsed = this.parser.parse(input.fileBuffer);
    const documentosVistosNoLote = new Set<string>();
    const contagens: ImportPreviewCounts = {
      importaveis: 0,
      ignoradas: 0,
      invalidas: 0,
      duplicadas: 0,
      erros: 0,
    };
    const linhas: ImportPreviewRow[] = [];

    for (const parsedRow of parsed.rows) {
      const linha = await this.avaliarLinha(parsedRow, documentosVistosNoLote);
      linhas.push(linha);
      contagens[this.contadorPara(linha.status)] += 1;
    }

    return { fonte: parsed.fonte, totalLinhas: parsed.rows.length, contagens, linhas };
  }

  private contadorPara(status: ImportPreviewRowStatus): keyof ImportPreviewCounts {
    switch (status) {
      case ImportPreviewRowStatus.IMPORTAVEL:
        return "importaveis";
      case ImportPreviewRowStatus.IGNORADA:
        return "ignoradas";
      case ImportPreviewRowStatus.INVALIDA:
        return "invalidas";
      case ImportPreviewRowStatus.DUPLICADA:
        return "duplicadas";
      case ImportPreviewRowStatus.ERRO:
        return "erros";
    }
  }

  private async avaliarLinha(
    parsedRow: ParsedImportRow,
    documentosVistosNoLote: Set<string>,
  ): Promise<ImportPreviewRow> {
    const base = { numeroLinha: parsedRow.numeroLinha };

    const todosOsCamposVazios =
      !parsedRow.documento &&
      !parsedRow.nome &&
      !parsedRow.valorTotal &&
      !parsedRow.valorDividaSelecionada;
    if (todosOsCamposVazios) {
      return {
        ...base,
        nome: null,
        documentoMascarado: null,
        status: ImportPreviewRowStatus.IGNORADA,
        motivo: "Linha completamente vazia",
      };
    }

    const nome = this.normalizarTexto(parsedRow.nome);
    if (!nome || !parsedRow.documento) {
      return {
        ...base,
        nome,
        documentoMascarado: parsedRow.documento,
        status: ImportPreviewRowStatus.INVALIDA,
        motivo: !nome ? "Campo obrigatório ausente: Nome" : "Campo obrigatório ausente: CPF/CNPJ",
      };
    }

    let documento: DocumentoMascarado;
    try {
      documento = DocumentoMascarado.create(parsedRow.documento);
    } catch (error) {
      if (error instanceof InvalidDocumentoMascaradoError) {
        return {
          ...base,
          nome,
          documentoMascarado: parsedRow.documento,
          status: ImportPreviewRowStatus.INVALIDA,
          motivo: "CPF/CNPJ em formato inesperado (não corresponde ao mascaramento conhecido)",
        };
      }
      throw error;
    }

    if (
      !this.valorEhNumericoOuVazio(parsedRow.valorTotal) ||
      !this.valorEhNumericoOuVazio(parsedRow.valorDividaSelecionada)
    ) {
      return {
        ...base,
        nome,
        documentoMascarado: documento.toString(),
        status: ImportPreviewRowStatus.ERRO,
        motivo: "Valor monetário não numérico",
      };
    }

    if (documentosVistosNoLote.has(documento.toString())) {
      return {
        ...base,
        nome,
        documentoMascarado: documento.toString(),
        status: ImportPreviewRowStatus.DUPLICADA,
        motivo: "Documento já aparece em outra linha deste mesmo lote",
      };
    }

    const linhasComEsseDocumento = await this.importRowRepository.findByDocumentoMascarado(
      documento.toString(),
    );
    const jaImportadoAntes = linhasComEsseDocumento.some(
      (row) => row.status === ImportRowStatus.IMPORTADA,
    );
    if (jaImportadoAntes) {
      return {
        ...base,
        nome,
        documentoMascarado: documento.toString(),
        status: ImportPreviewRowStatus.DUPLICADA,
        motivo: "Documento já importado em um lote anterior",
      };
    }

    documentosVistosNoLote.add(documento.toString());
    return {
      ...base,
      nome,
      documentoMascarado: documento.toString(),
      status: ImportPreviewRowStatus.IMPORTAVEL,
      motivo: null,
    };
  }

  private normalizarTexto(value: string | null): string | null {
    if (!value) return null;
    const normalizado = value.trim().replace(/\s+/g, " ");
    return normalizado.length > 0 ? normalizado : null;
  }

  private valorEhNumericoOuVazio(value: string | null): boolean {
    if (value === null) return true;
    const normalizado = value.trim();
    if (normalizado.length === 0) return true;
    return !Number.isNaN(Number(normalizado));
  }
}
