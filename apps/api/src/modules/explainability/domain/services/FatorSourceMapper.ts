import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { Fator } from "../../../classification/domain/value-objects/Fator.js";
import { FatorExplicado } from "../value-objects/FatorExplicado.js";

/**
 * `fonte → campo` de `DossieEvidencias` — tabela estrutural exaustiva sobre
 * o enum fechado `DossieFonte` (ver `Dossie.ts`), não sobre "quais regras de
 * classificação existem". Antes da ADR 0037, esta classe mapeava
 * `Fator.nome → {fonte, campo}` e falhava em runtime se uma regra nova
 * esquecesse de atualizar a tabela; agora `Fator.fonte` já vem preenchido
 * pela própria regra, e esta tabela nunca fica obsoleta ao adicionar uma
 * regra (só precisaria mudar se uma fonte de evidência nova fosse
 * adicionada ao Dossiê, o que já exige tocar em `Dossie.ts` de qualquer
 * forma). Ver ADR 0020/0037.
 */
const FONTE_PARA_CAMPO: Record<DossieFonte, keyof DossieEvidencias> = {
  PGFN: "pgfn",
  DATAJUD: "dataJud",
  RECEITA_FEDERAL: "receitaFederal",
  PORTAL_TRANSPARENCIA: "portalTransparencia",
  CENPROT: "cenprot",
};

export class FatorSourceMapper {
  static map(fatores: Fator[], evidencias: DossieEvidencias): FatorExplicado[] {
    return fatores.map((fator) => this.mapOne(fator, evidencias));
  }

  private static mapOne(fator: Fator, evidencias: DossieEvidencias): FatorExplicado {
    return FatorExplicado.create({
      nome: fator.nome,
      peso: fator.peso,
      direcao: fator.direcao,
      justificativa: fator.justificativa,
      fonte: fator.fonte,
      evidencia: evidencias[FONTE_PARA_CAMPO[fator.fonte]],
    });
  }
}
