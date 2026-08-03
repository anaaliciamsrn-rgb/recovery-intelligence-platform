import type {
  IEmpresaEvidenceSimulator,
  SimulatedEvidence,
  SimulatedEvidenceSet,
} from "../application/ports/IEmpresaEvidenceSimulator.js";

const NATUREZAS_JUDICIAIS = ["CIVEL", "TRABALHISTA", "TRIBUTARIA", "EXECUCAO_FISCAL"] as const;
const NATUREZAS_JURIDICAS = [
  "Sociedade Empresária Limitada",
  "Empresário Individual",
  "Sociedade Anônima Fechada",
  "Sociedade Simples Limitada",
] as const;
const ORGAOS_SANCIONADORES = [
  "Controladoria-Geral da União",
  "Tribunal de Contas do Estado",
  "Ministério Público Estadual",
] as const;

/** PRNG determinístico (mulberry32) — mesmo CNPJ produz sempre a mesma simulação, reimportar a mesma planilha não muda os números a cada execução. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return hash;
}

function pick<T>(rand: () => number, options: readonly T[]): T {
  const value = options[Math.floor(rand() * options.length)];
  if (value === undefined) throw new Error("options não pode ser vazio");
  return value;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * "IA de demonstração" (ver ADR 0037) — gera evidências plausíveis e
 * variadas para as cinco fontes do Dossiê a partir só do CNPJ, sem nenhuma
 * chamada externa real. Nunca deve ser confundida com uma integração real:
 * o objetivo é uma demonstração comercial coerente, honestamente simulada,
 * não uma fraude de dados. Distribuição das probabilidades escolhida para
 * produzir uma carteira com risco variado (baixo/médio/alto), nunca tudo
 * igual — o que tornaria o dashboard óbvio como fake.
 */
export class SimulatedEmpresaEvidenceProvider implements IEmpresaEvidenceSimulator {
  simulate(cnpj: string): SimulatedEvidenceSet {
    const rand = mulberry32(seedFromText(cnpj));

    return {
      PGFN: this.simularPgfn(rand),
      DATAJUD: this.simularDataJud(rand),
      RECEITA_FEDERAL: this.simularReceitaFederal(rand),
      PORTAL_TRANSPARENCIA: this.simularPortalTransparencia(rand),
      CENPROT: this.simularCenprot(rand),
    };
  }

  private simularPgfn(rand: () => number): SimulatedEvidence {
    const temPendencia = rand() < 0.32;
    return {
      status: "ENCONTRADO",
      valor: {
        temPendencia,
        valorConsolidado: temPendencia ? round2(rand() * 480_000 + 5_000) : 0,
        quantidadeInscricoes: temPendencia ? Math.floor(rand() * 6) + 1 : 0,
      },
      confidenceScore: round2(0.72 + rand() * 0.24),
      motivoErro: null,
    };
  }

  private simularDataJud(rand: () => number): SimulatedEvidence {
    const temProcesso = rand() < 0.28;
    return {
      status: "ENCONTRADO",
      valor: {
        temProcesso,
        quantidadeProcessos: temProcesso ? Math.floor(rand() * 4) + 1 : 0,
        naturezaPrincipal: temProcesso ? pick(rand, NATUREZAS_JUDICIAIS) : null,
      },
      confidenceScore: round2(0.68 + rand() * 0.28),
      motivoErro: null,
    };
  }

  private simularReceitaFederal(rand: () => number): SimulatedEvidence {
    const roll = rand();
    const situacaoCadastral =
      roll < 0.85 ? "ATIVA" : roll < 0.93 ? "SUSPENSA" : roll < 0.97 ? "INAPTA" : "BAIXADA";

    return {
      status: "ENCONTRADO",
      valor: {
        situacaoCadastral,
        naturezaJuridica: pick(rand, NATUREZAS_JURIDICAS),
        capitalSocial: round2(rand() * 950_000 + 5_000),
      },
      confidenceScore: round2(0.8 + rand() * 0.19),
      motivoErro: null,
    };
  }

  private simularPortalTransparencia(rand: () => number): SimulatedEvidence {
    const possuiSancao = rand() < 0.12;
    if (!possuiSancao) {
      return {
        status: "NAO_ENCONTRADO",
        valor: null,
        confidenceScore: round2(0.75 + rand() * 0.2),
        motivoErro: null,
      };
    }
    return {
      status: "ENCONTRADO",
      valor: {
        possuiSancao: true,
        tipoSancao: pick(rand, ["INIDONEIDADE", "SUSPENSAO_TEMPORARIA", "IMPEDIMENTO_LICITAR"]),
        orgaoSancionador: pick(rand, ORGAOS_SANCIONADORES),
      },
      confidenceScore: round2(0.7 + rand() * 0.25),
      motivoErro: null,
    };
  }

  private simularCenprot(rand: () => number): SimulatedEvidence {
    if (rand() < 0.04) {
      return {
        status: "ERRO_CONSULTA",
        valor: null,
        confidenceScore: null,
        motivoErro: "Tempo limite excedido ao consultar o CENPROT (simulado)",
      };
    }

    const possuiProtesto = rand() < 0.18;
    if (!possuiProtesto) {
      return {
        status: "NAO_ENCONTRADO",
        valor: null,
        confidenceScore: round2(0.75 + rand() * 0.2),
        motivoErro: null,
      };
    }
    return {
      status: "ENCONTRADO",
      valor: {
        possuiProtesto: true,
        quantidadeProtestos: Math.floor(rand() * 5) + 1,
        valorTotalProtestado: round2(rand() * 120_000 + 1_000),
      },
      confidenceScore: round2(0.65 + rand() * 0.3),
      motivoErro: null,
    };
  }
}
