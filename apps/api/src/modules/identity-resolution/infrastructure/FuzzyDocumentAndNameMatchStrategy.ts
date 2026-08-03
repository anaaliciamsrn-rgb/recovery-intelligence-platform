import { MatchSignal } from "../domain/value-objects/MatchSignal.js";
import type { IIdentityResolutionStrategy } from "../application/ports/IIdentityResolutionStrategy.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
} from "../application/ports/IIdentityResolutionSourceProvider.js";
import { nameSimilarity } from "./nameSimilarity.js";

const DOCUMENTO_SIMILAR = "DOCUMENTO_SIMILAR";
const NOME_SIMILAR = "NOME_SIMILAR";
const LIMIAR_DOCUMENTO_FAVORAVEL = 0.7;
const LIMIAR_NOME_FAVORAVEL = 0.5;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Fração de posições em que os dígitos coincidem, sobre o maior dos dois
 * comprimentos — não é distância de edição (sem realinhamento), de
 * propósito: mesma disciplina de "deliberadamente não sofisticado" já usada
 * em `PartialDocumentMatchStrategy` (ADR 0019). Serve tanto para um
 * documento completo digitado com um dígito errado quanto para um
 * documento parcial/incompleto.
 */
function documentSimilarity(a: string, b: string): number {
  const da = onlyDigits(a);
  const db = onlyDigits(b);
  if (da.length === 0 || db.length === 0) return 0;

  const tamanho = Math.max(da.length, db.length);
  let coincidencias = 0;
  for (let index = 0; index < tamanho; index += 1) {
    if (da[index] !== undefined && da[index] === db[index]) coincidencias += 1;
  }
  return coincidencias / tamanho;
}

/**
 * Estratégia usada pela busca pública (`POST /identity-resolution/resolve`,
 * ver ADR 0037) — diferente de `ExactDocumentMatchStrategy` (documento
 * idêntico ou nada) e de `PartialDocumentMatchStrategy` (só o mascaramento
 * específico da PGFN): aqui o documento pode vir completo, com erro de
 * digitação, ou incompleto, e o nome pode vir com grafia levemente
 * diferente — o objetivo é justamente produzir uma confiança intermediária
 * ("possível correspondência"), não só match binário. Nunca decide por
 * conta própria — como sempre, isso é responsabilidade de
 * `IdentityMatchScorer`.
 */
export class FuzzyDocumentAndNameMatchStrategy implements IIdentityResolutionStrategy {
  compare(query: IdentityResolutionQuery, candidate: IdentityResolutionCandidate): MatchSignal[] {
    const signals: MatchSignal[] = [];

    const similaridadeDocumento = documentSimilarity(query.documento, candidate.documento);
    signals.push(
      MatchSignal.create({
        tipo: DOCUMENTO_SIMILAR,
        peso: 0.6,
        favoravel: similaridadeDocumento >= LIMIAR_DOCUMENTO_FAVORAVEL,
        descricao: `Similaridade de documento: ${(similaridadeDocumento * 100).toFixed(0)}%`,
      }),
    );

    if (query.nome) {
      const similaridadeNome = nameSimilarity(query.nome, candidate.nome);
      signals.push(
        MatchSignal.create({
          tipo: NOME_SIMILAR,
          peso: 0.4,
          favoravel: similaridadeNome >= LIMIAR_NOME_FAVORAVEL,
          descricao: `Similaridade de nome: ${(similaridadeNome * 100).toFixed(0)}%`,
        }),
      );
    }

    return signals;
  }
}
