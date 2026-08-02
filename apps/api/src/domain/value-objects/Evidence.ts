import { ConfidenceScore } from "./ConfidenceScore.js";

export type EvidenceStatus = "ENCONTRADO" | "NAO_ENCONTRADO" | "NAO_CONSULTADO" | "ERRO_CONSULTA";

export const EvidenceStatus = {
  ENCONTRADO: "ENCONTRADO",
  NAO_ENCONTRADO: "NAO_ENCONTRADO",
  NAO_CONSULTADO: "NAO_CONSULTADO",
  ERRO_CONSULTA: "ERRO_CONSULTA",
} as const satisfies Record<string, EvidenceStatus>;

interface EvidenceEncontrada<T> {
  status: "ENCONTRADO";
  valor: T;
  fonte: string;
  dataConsulta: Date;
  confidenceScore: ConfidenceScore;
}

interface EvidenceNaoEncontrada {
  status: "NAO_ENCONTRADO";
  fonte: string;
  dataConsulta: Date;
  confidenceScore: ConfidenceScore;
}

interface EvidenceNaoConsultada {
  status: "NAO_CONSULTADO";
  fonte: string;
}

interface EvidenceComErro {
  status: "ERRO_CONSULTA";
  fonte: string;
  dataConsulta: Date;
  motivoErro: string;
}

/**
 * Estrutura genérica usada por toda consulta futura a uma fonte externa
 * (PGFN, DataJud, Receita, Portal da Transparência, CENPROT — ver ADR 0013 e
 * 0015) ou interna. É uma union discriminada por `status`, não uma classe
 * com campos opcionais: o TypeScript IMPEDE, em tempo de compilação, ler
 * `valor` fora do branch `ENCONTRADO`, ler `motivoErro` fora do branch
 * `ERRO_CONSULTA`, etc. Isso é deliberado — a exigência era que os quatro
 * estados "nunca podem ser confundidos", e um objeto com campos nullable
 * permitiria exatamente esse tipo de confusão em tempo de execução (ex.:
 * checar `if (evidence.valor)` e tratar "encontrado com valor falsy" como
 * "não encontrado"). Ver ADR 0014.
 *
 * `NAO_CONSULTADO` não tem `dataConsulta`/`confidenceScore` — representa uma
 * fonte que ainda nem foi chamada, não uma chamada que retornou vazio.
 */
export type Evidence<T> =
  EvidenceEncontrada<T> | EvidenceNaoEncontrada | EvidenceNaoConsultada | EvidenceComErro;

export const Evidence = {
  encontrada<T>(props: {
    valor: T;
    fonte: string;
    dataConsulta: Date;
    confidenceScore: ConfidenceScore;
  }): Evidence<T> {
    return { status: EvidenceStatus.ENCONTRADO, ...props };
  },

  naoEncontrada<T>(props: {
    fonte: string;
    dataConsulta: Date;
    confidenceScore: ConfidenceScore;
  }): Evidence<T> {
    return { status: EvidenceStatus.NAO_ENCONTRADO, ...props };
  },

  naoConsultada<T>(props: { fonte: string }): Evidence<T> {
    return { status: EvidenceStatus.NAO_CONSULTADO, ...props };
  },

  comErro<T>(props: { fonte: string; dataConsulta: Date; motivoErro: string }): Evidence<T> {
    return { status: EvidenceStatus.ERRO_CONSULTA, ...props };
  },
} as const;
