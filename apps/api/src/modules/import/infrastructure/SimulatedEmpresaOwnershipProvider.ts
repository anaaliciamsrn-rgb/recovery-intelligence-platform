import type {
  IEmpresaOwnershipSimulator,
  SimulatedSocio,
} from "../application/ports/IEmpresaOwnershipSimulator.js";

const CPF_WEIGHTS_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_WEIGHTS_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

const PRIMEIROS_NOMES = [
  "João Pedro",
  "Maria",
  "Carlos",
  "Ana Luiza",
  "Pedro Henrique",
  "Fernanda",
  "Ricardo",
  "Juliana",
  "Marcos",
  "Camila",
  "Rafael",
  "Isabela",
  "Bruno",
  "Letícia",
  "Gabriel",
  "Vanessa",
  "Thiago",
  "Renata",
  "Diego",
  "Patrícia",
] as const;

const SOBRENOMES = [
  "Lima",
  "Souza",
  "Mendes",
  "Ferreira",
  "Barros",
  "Nogueira",
  "Cardoso",
  "Teixeira",
  "Machado",
  "Ribeiro",
  "Correia",
  "Andrade",
  "Pinheiro",
  "Castro",
  "Moreira",
] as const;

/** PRNG determinístico (mulberry32) — mesmo CNPJ produz sempre a mesma estrutura societária. Duplicado de `SimulatedEmpresaEvidenceProvider` de propósito (ver ADR 0010/0037 sobre "duplicação sobre acoplamento"). */
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

function computeCheckDigit(base: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + weight * Number(base[index] ?? 0),
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Gera um CPF fictício com dígitos verificadores válidos (passa `CPF.create()`) a partir do PRNG do chamador — nunca de uma pessoa real. */
function generateFakeCpf(rand: () => number): string {
  let base = "";
  for (let i = 0; i < 9; i += 1) base += Math.floor(rand() * 10).toString();
  const d1 = computeCheckDigit(base, CPF_WEIGHTS_1);
  const base10 = `${base}${d1}`;
  const d2 = computeCheckDigit(base10, CPF_WEIGHTS_2);
  return `${base10}${d2}`;
}

function pick<T>(rand: () => number, options: readonly T[]): T {
  const value = options[Math.floor(rand() * options.length)];
  if (value === undefined) throw new Error("options não pode ser vazio");
  return value;
}

function generateFakeName(rand: () => number): string {
  return `${pick(rand, PRIMEIROS_NOMES)} ${pick(rand, SOBRENOMES)}`;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

/**
 * "IA de demonstração" para estrutura societária (ver ADR 0037) — gera de 1
 * a 3 sócios/administradores fictícios por Empresa a partir só do CNPJ,
 * usando `responsavel` (coluna "Responsável" da planilha) como o
 * sócio-administrador principal quando presente. Nunca consulta o QSA real
 * da Receita Federal — é o que viabiliza o grafo de relacionamento e a
 * riqueza societária da demonstração sem fingir uma integração que não
 * existe.
 */
export class SimulatedEmpresaOwnershipProvider implements IEmpresaOwnershipSimulator {
  simulate(cnpj: string, responsavel: string | null): SimulatedSocio[] {
    const rand = mulberry32(seedFromText(`${cnpj}:socios`));
    const socios: SimulatedSocio[] = [];
    let restante = 100;

    if (responsavel && responsavel.trim().length > 0) {
      const percentual = round1(45 + rand() * 25);
      socios.push({
        nome: responsavel.trim(),
        cpf: generateFakeCpf(rand),
        papel: "SOCIO_ADMINISTRADOR",
        percentualParticipacao: percentual,
      });
      restante -= percentual;
    }

    const quantidadeAdicionais = responsavel ? (rand() < 0.7 ? 1 : 2) : rand() < 0.5 ? 2 : 3;

    for (let index = 0; index < quantidadeAdicionais; index += 1) {
      const isUltimo = index === quantidadeAdicionais - 1;
      const semDireitoAEquity = socios.length > 0 && rand() < 0.2;
      const papel: SimulatedSocio["papel"] = semDireitoAEquity
        ? "ADMINISTRADOR"
        : socios.length === 0
          ? "SOCIO_ADMINISTRADOR"
          : "SOCIO";

      let percentual: number | null = null;
      if (!semDireitoAEquity) {
        percentual = isUltimo
          ? round1(Math.max(restante, 1))
          : round1(restante * (0.4 + rand() * 0.3));
        restante = Math.max(restante - percentual, 0);
      }

      socios.push({
        nome: generateFakeName(rand),
        cpf: generateFakeCpf(rand),
        papel,
        percentualParticipacao:
          percentual !== null ? Math.min(Math.max(percentual, 0.5), 100) : null,
      });
    }

    return socios;
  }
}
