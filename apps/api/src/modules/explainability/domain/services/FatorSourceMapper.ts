import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { Fator } from "../../../classification/domain/value-objects/Fator.js";
import { FatorExplicado } from "../value-objects/FatorExplicado.js";

export class FatorSemFonteMapeadaError extends DomainError {}

interface FonteMapeada {
  fonte: DossieFonte;
  campo: keyof DossieEvidencias;
}

/**
 * Liga cada `Fator.nome` (classification, ADR 0016) à fonte/campo de
 * evidência do Dossiê de onde ele vem. `IClassificationRule` não expõe essa
 * ligação (só `nome`/`avaliar`), então esta tabela é a única fonte de
 * verdade — reflete, hoje, as três regras registradas no container de
 * `classification`. Adicionar uma regra nova aí exige uma entrada
 * correspondente aqui; sem ela, `map` falha explicitamente em vez de
 * adivinhar a fonte de um fator desconhecido. Ver ADR 0020.
 */
const FATOR_NOME_PARA_FONTE: Record<string, FonteMapeada> = {
  "Pendência Fiscal (PGFN)": { fonte: "PGFN", campo: "pgfn" },
  "Processo Judicial (DataJud)": { fonte: "DATAJUD", campo: "dataJud" },
  "Situação Cadastral (Receita Federal)": { fonte: "RECEITA_FEDERAL", campo: "receitaFederal" },
};

export class FatorSourceMapper {
  static map(fatores: Fator[], evidencias: DossieEvidencias): FatorExplicado[] {
    return fatores.map((fator) => this.mapOne(fator, evidencias));
  }

  private static mapOne(fator: Fator, evidencias: DossieEvidencias): FatorExplicado {
    const mapeamento = FATOR_NOME_PARA_FONTE[fator.nome];
    if (!mapeamento) {
      throw new FatorSemFonteMapeadaError(
        `Nenhuma fonte mapeada para o fator "${fator.nome}" — atualize FatorSourceMapper ao registrar uma nova regra de classificação`,
      );
    }

    return FatorExplicado.create({
      nome: fator.nome,
      peso: fator.peso,
      direcao: fator.direcao,
      justificativa: fator.justificativa,
      fonte: mapeamento.fonte,
      evidencia: evidencias[mapeamento.campo],
    });
  }
}
