import type { FeatureFlagOverride } from "../entities/FeatureFlagOverride.js";
import type { FeatureFlagScopeType } from "../value-objects/FeatureFlagScope.js";

export interface IFeatureFlagOverrideRepository {
  findByFeatureFlagId(featureFlagId: string): Promise<FeatureFlagOverride[]>;
  findOne(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<FeatureFlagOverride | null>;
  save(override: FeatureFlagOverride): Promise<void>;
  remove(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<void>;
}
