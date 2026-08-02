import type { CreateDossieUseCase } from "../../../dossie/application/use-cases/CreateDossieUseCase.js";
import type { RegistrarEvidenciaUseCase } from "../../../dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import type { ResolveIdentityUseCase } from "../../../identity-resolution/application/use-cases/ResolveIdentityUseCase.js";
import type { ImportRow } from "../../domain/entities/ImportRow.js";
import { ImportRowStatus } from "../../domain/value-objects/ImportRowStatus.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";

export interface ResolveImportRowIdentityOutput {
  totalProcessadas: number;
  totalResolvidas: number;
  totalSemCorrespondencia: number;
}

/**
 * Segunda fase do pipeline (a primeira é `ImportPgfnSpreadsheetUseCase`):
 * para cada linha `IMPORTADA` ainda `PENDENTE`, tenta resolver a identidade
 * via `identity-resolution` (com `PartialDocumentMatchStrategy`, ADR 0019).
 * Só uma decisão `MATCH` (não `POSSIBLE_MATCH`) resolve automaticamente —
 * correspondência incerta fica registrada como sem correspondência, não
 * como um "talvez". Quando resolve, cria o Dossiê e registra a evidência
 * PGFN automaticamente, reaproveitando os use cases de `dossie` sem
 * nenhuma alteração neles. Classificação/Recomendação/Prompt não são
 * chamados aqui — são computados sob demanda a partir do Dossiê já
 * existente (ver ADR 0019), não precisam de um passo de execução no
 * pipeline de importação.
 */
export class ResolveImportRowIdentityUseCase {
  constructor(
    private readonly importRowRepository: IImportRowRepository,
    private readonly resolveIdentityUseCase: ResolveIdentityUseCase,
    private readonly createDossieUseCase: CreateDossieUseCase,
    private readonly registrarEvidenciaUseCase: RegistrarEvidenciaUseCase,
  ) {}

  async execute(importBatchId: string): Promise<ResolveImportRowIdentityOutput> {
    const rows = await this.importRowRepository.findByImportBatchId(importBatchId);
    const pendentes = rows.filter(
      (row) => row.status === ImportRowStatus.IMPORTADA && row.resolutionStatus === "PENDENTE",
    );

    let totalResolvidas = 0;
    let totalSemCorrespondencia = 0;

    for (const row of pendentes) {
      const resolvida = await this.resolverLinha(row);
      if (resolvida) totalResolvidas += 1;
      else totalSemCorrespondencia += 1;
      await this.importRowRepository.save(row);
    }

    return {
      totalProcessadas: pendentes.length,
      totalResolvidas,
      totalSemCorrespondencia,
    };
  }

  private async resolverLinha(row: ImportRow): Promise<boolean> {
    if (!row.documentoMascarado) {
      row.marcarSemCorrespondencia();
      return false;
    }

    const resultados = await this.resolveIdentityUseCase.execute({
      documento: row.documentoMascarado,
      nome: row.nome,
    });

    const melhorMatch = resultados.find((resultado) => resultado.decision === "MATCH");
    if (!melhorMatch) {
      row.marcarSemCorrespondencia();
      return false;
    }

    const dossie = await this.createDossieUseCase.execute({
      subjectType: "PESSOA",
      subjectId: melhorMatch.candidateId,
    });

    await this.registrarEvidenciaUseCase.execute({
      dossieId: dossie.id,
      fonte: "PGFN",
      status: "ENCONTRADO",
      valor: {
        valorTotal: row.valorTotal,
        valorDividaSelecionada: row.valorDividaSelecionada,
        naturezaDivida: row.naturezaDivida,
      },
      confidenceScore: melhorMatch.confidenceScore.toNumber(),
      motivoErro: null,
    });

    row.marcarResolvida(melhorMatch.candidateId, dossie.id);
    return true;
  }
}
