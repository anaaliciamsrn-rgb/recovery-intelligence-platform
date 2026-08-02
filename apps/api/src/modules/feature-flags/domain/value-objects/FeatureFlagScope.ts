export type FeatureFlagScopeType = "TENANT" | "AMBIENTE" | "USUARIO";

export const FeatureFlagScopeType = {
  TENANT: "TENANT",
  AMBIENTE: "AMBIENTE",
  USUARIO: "USUARIO",
} as const satisfies Record<string, FeatureFlagScopeType>;
