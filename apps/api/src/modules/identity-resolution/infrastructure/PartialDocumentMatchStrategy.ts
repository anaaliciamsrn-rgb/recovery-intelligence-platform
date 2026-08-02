import { MatchSignal } from "../domain/value-objects/MatchSignal.js";
import type { IIdentityResolutionStrategy } from "../application/ports/IIdentityResolutionStrategy.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
} from "../application/ports/IIdentityResolutionSourceProvider.js";
import { nameSimilarity } from "./nameSimilarity.js";

const DOCUMENTO_PARCIAL = "DOCUMENTO_PARCIAL";
const NOME_SIMILAR = "NOME_SIMILAR";
const LIMIAR_NOME_FAVORAVEL = 0.5;

/** Formato de mascaramento oficial da PGFN: 3 dígitos mascarados, 6 visíveis, 2 dígitos verificadores mascarados. */
const MASCARA_CPF_PGFN = /^\*{3}\.(\d{3})\.(\d{3})-\*{2}$/;

function digitosVisiveisDoMascarado(documento: string): string | null {
  const match = MASCARA_CPF_PGFN.exec(documento.trim());
  return match ? `${match[1]}${match[2]}` : null;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Estratégia para quando a query traz um documento **incompleto** (mascarado
 * pela fonte original, ex.: PGFN) em vez de um CPF/CNPJ completo —
 * `ExactDocumentMatchStrategy` (ADR 0013) nunca poderia servir aqui, porque
 * um documento parcial nunca é igual a um completo. Produz até dois sinais:
 * os 6 dígitos visíveis aparecem nas mesmas posições do CPF do candidato, e
 * similaridade de nome. Nenhum dos dois sozinho decide o match — isso é
 * responsabilidade do `IdentityMatchScorer`, como sempre. Deliberadamente
 * "não sofisticado": sem fonética, sem distância de edição. Ver ADR 0019.
 */
export class PartialDocumentMatchStrategy implements IIdentityResolutionStrategy {
  compare(query: IdentityResolutionQuery, candidate: IdentityResolutionCandidate): MatchSignal[] {
    const signals: MatchSignal[] = [];

    const digitosVisiveis = digitosVisiveisDoMascarado(query.documento);
    if (digitosVisiveis) {
      const candidatoDigitos = onlyDigits(candidate.documento);
      // Máscara vista na PGFN é sempre de CPF (11 dígitos): posições 3-8
      // (as 6 do meio) ficam visíveis; 3 iniciais e os 2 verificadores são
      // mascarados.
      const candidatoVisiveis =
        candidatoDigitos.length === 11 ? candidatoDigitos.slice(3, 9) : null;
      const documentoCompativel = candidatoVisiveis === digitosVisiveis;

      signals.push(
        MatchSignal.create({
          tipo: DOCUMENTO_PARCIAL,
          peso: 0.6,
          favoravel: documentoCompativel,
          descricao: documentoCompativel
            ? "Dígitos visíveis do documento mascarado coincidem com o candidato"
            : "Dígitos visíveis do documento mascarado não coincidem com o candidato",
        }),
      );
    }

    if (query.nome) {
      const similaridade = nameSimilarity(query.nome, candidate.nome);
      signals.push(
        MatchSignal.create({
          tipo: NOME_SIMILAR,
          peso: 0.4,
          favoravel: similaridade >= LIMIAR_NOME_FAVORAVEL,
          descricao: `Similaridade de nome: ${(similaridade * 100).toFixed(0)}%`,
        }),
      );
    }

    return signals;
  }
}
