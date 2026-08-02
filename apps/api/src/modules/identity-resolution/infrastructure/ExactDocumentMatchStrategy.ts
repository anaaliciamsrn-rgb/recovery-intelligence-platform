import { MatchSignal } from "../domain/value-objects/MatchSignal.js";
import type { IIdentityResolutionStrategy } from "../application/ports/IIdentityResolutionStrategy.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
} from "../application/ports/IIdentityResolutionSourceProvider.js";

const DOCUMENTO_EXATO = "DOCUMENTO_EXATO";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Único sinal: documento (CPF/CNPJ, normalizado para dígitos) idêntico ou
 * não. Deliberadamente sem similaridade de nome, fonética, ou qualquer outro
 * sinal — a Sprint 4 pede a fundação, não um algoritmo de resolução de
 * identidade de verdade (ver ADR 0013). Trocar/estender esta estratégia não
 * deve exigir mudanças em `ResolveIdentityUseCase` nem no scorer.
 */
export class ExactDocumentMatchStrategy implements IIdentityResolutionStrategy {
  compare(query: IdentityResolutionQuery, candidate: IdentityResolutionCandidate): MatchSignal[] {
    const documentosIguais = onlyDigits(query.documento) === onlyDigits(candidate.documento);

    return [
      MatchSignal.create({
        tipo: DOCUMENTO_EXATO,
        peso: 1,
        favoravel: documentosIguais,
        descricao: documentosIguais
          ? "Documento da query é idêntico ao do candidato"
          : "Documento da query difere do candidato",
      }),
    ];
  }
}
