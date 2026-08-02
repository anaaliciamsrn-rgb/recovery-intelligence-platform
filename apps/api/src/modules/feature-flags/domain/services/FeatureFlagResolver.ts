import type { FeatureFlag } from "../entities/FeatureFlag.js";
import type { FeatureFlagOverride } from "../entities/FeatureFlagOverride.js";
import { FeatureFlagScopeType } from "../value-objects/FeatureFlagScope.js";

export interface FeatureFlagEvaluationContext {
  tenantId?: string | null;
  ambiente?: string | null;
  userId?: string | null;
}

/** De onde veio a decisão final — explicável, nunca uma caixa-preta (mesmo princípio já aplicado em `explainability`, ADR 0020). */
export type FeatureFlagResolutionSource = "USUARIO" | "TENANT" | "AMBIENTE" | "PADRAO";

export interface FeatureFlagResolution {
  ativo: boolean;
  origem: FeatureFlagResolutionSource;
}

/**
 * Resolve se uma flag está ativa para um contexto — puro, sem I/O.
 * Precedência fixa, do mais específico para o mais genérico: usuário >
 * tenant > ambiente > `ativoPadrao`. Ver ADR 0031.
 */
export class FeatureFlagResolver {
  static resolver(
    flag: FeatureFlag,
    overrides: FeatureFlagOverride[],
    contexto: FeatureFlagEvaluationContext,
  ): FeatureFlagResolution {
    if (contexto.userId) {
      const override = overrides.find(
        (o) => o.escopoTipo === FeatureFlagScopeType.USUARIO && o.escopoValor === contexto.userId,
      );
      if (override) return { ativo: override.ativo, origem: "USUARIO" };
    }

    if (contexto.tenantId) {
      const override = overrides.find(
        (o) => o.escopoTipo === FeatureFlagScopeType.TENANT && o.escopoValor === contexto.tenantId,
      );
      if (override) return { ativo: override.ativo, origem: "TENANT" };
    }

    if (contexto.ambiente) {
      const override = overrides.find(
        (o) =>
          o.escopoTipo === FeatureFlagScopeType.AMBIENTE && o.escopoValor === contexto.ambiente,
      );
      if (override) return { ativo: override.ativo, origem: "AMBIENTE" };
    }

    return { ativo: flag.ativoPadrao, origem: "PADRAO" };
  }
}
