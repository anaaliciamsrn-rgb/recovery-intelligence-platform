import { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { DossieFonte } from "../value-objects/DossieFonte.js";
import type { DossieSubjectType } from "../value-objects/DossieSubjectType.js";

export interface DossieEvidencias {
  pgfn: Evidence<unknown>;
  dataJud: Evidence<unknown>;
  receitaFederal: Evidence<unknown>;
  portalTransparencia: Evidence<unknown>;
  cenprot: Evidence<unknown>;
}

export interface DossieProps {
  id: string;
  subjectType: DossieSubjectType;
  /** Referência solta ao `Pessoa.id`/`Empresa.id` (módulo `party`) — nunca o objeto. */
  subjectId: string;
  geradoEm: Date;
  evidencias: DossieEvidencias;
  createdAt: Date;
  updatedAt: Date;
}

const FONTE_PARA_CAMPO: Record<DossieFonte, keyof DossieEvidencias> = {
  PGFN: "pgfn",
  DATAJUD: "dataJud",
  RECEITA_FEDERAL: "receitaFederal",
  PORTAL_TRANSPARENCIA: "portalTransparencia",
  CENPROT: "cenprot",
};

/**
 * Perfil consultável de uma Pessoa ou Empresa, agregando evidências de até
 * cinco fontes externas — nenhuma integrada ainda (ver ADR 0015). Nasce
 * "vazio" (todas as evidências `NAO_CONSULTADO`) via `criarVazio`; cada
 * evidência é preenchida individualmente via `atualizarEvidencia` quando (no
 * futuro) uma integração real existir. Este dossiê não calcula score nem
 * classificação — isso é escopo da Sprint 7 (Rule Engine).
 */
export class Dossie {
  private constructor(private props: DossieProps) {}

  static criarVazio(input: {
    id: string;
    subjectType: DossieSubjectType;
    subjectId: string;
    now: Date;
  }): Dossie {
    const naoConsultado = <T>(fonte: DossieFonte): Evidence<T> => Evidence.naoConsultada({ fonte });

    return new Dossie({
      id: input.id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      geradoEm: input.now,
      evidencias: {
        pgfn: naoConsultado("PGFN"),
        dataJud: naoConsultado("DATAJUD"),
        receitaFederal: naoConsultado("RECEITA_FEDERAL"),
        portalTransparencia: naoConsultado("PORTAL_TRANSPARENCIA"),
        cenprot: naoConsultado("CENPROT"),
      },
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static create(props: DossieProps): Dossie {
    return new Dossie(props);
  }

  get id(): string {
    return this.props.id;
  }

  get subjectType(): DossieSubjectType {
    return this.props.subjectType;
  }

  get subjectId(): string {
    return this.props.subjectId;
  }

  get geradoEm(): Date {
    return this.props.geradoEm;
  }

  get evidencias(): Readonly<DossieEvidencias> {
    return { ...this.props.evidencias };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Substitui a evidência de uma única fonte — as demais permanecem intocadas. */
  atualizarEvidencia(fonte: DossieFonte, evidence: Evidence<unknown>, now: Date): void {
    const campo = FONTE_PARA_CAMPO[fonte];
    this.props.evidencias = { ...this.props.evidencias, [campo]: evidence };
    this.props.updatedAt = now;
  }

  toProps(): Readonly<DossieProps> {
    return { ...this.props, evidencias: { ...this.props.evidencias } };
  }
}
