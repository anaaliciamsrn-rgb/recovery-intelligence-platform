import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
  IIdentityResolutionSourceProvider,
} from "../../../src/modules/identity-resolution/application/ports/IIdentityResolutionSourceProvider.js";
import type { IIdentityResolutionStrategy } from "../../../src/modules/identity-resolution/application/ports/IIdentityResolutionStrategy.js";
import type { IdentitySourceType } from "../../../src/modules/identity-resolution/domain/value-objects/IdentitySourceType.js";
import { MatchSignal } from "../../../src/modules/identity-resolution/domain/value-objects/MatchSignal.js";

export class FakeIdentityResolutionSourceProvider implements IIdentityResolutionSourceProvider {
  constructor(
    readonly sourceType: IdentitySourceType,
    private readonly candidates: IdentityResolutionCandidate[],
  ) {}

  async findCandidates(_query: IdentityResolutionQuery): Promise<IdentityResolutionCandidate[]> {
    return this.candidates;
  }
}

/** Devolve um sinal favorável com o peso fixo dado — sem lógica real de comparação. */
export class FakeAlwaysFavorableStrategy implements IIdentityResolutionStrategy {
  constructor(private readonly peso: number = 1) {}

  compare(): MatchSignal[] {
    return [
      MatchSignal.create({ tipo: "FAKE", peso: this.peso, favoravel: true, descricao: "fake" }),
    ];
  }
}
