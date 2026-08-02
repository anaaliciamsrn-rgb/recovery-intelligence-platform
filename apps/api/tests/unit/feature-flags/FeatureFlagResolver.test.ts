import { FeatureFlag } from "../../../src/modules/feature-flags/domain/entities/FeatureFlag.js";
import { FeatureFlagOverride } from "../../../src/modules/feature-flags/domain/entities/FeatureFlagOverride.js";
import { FeatureFlagResolver } from "../../../src/modules/feature-flags/domain/services/FeatureFlagResolver.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildFlag(ativoPadrao: boolean) {
  return FeatureFlag.create({
    id: "f1",
    chave: "modulo-x",
    descricao: null,
    ativoPadrao,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function buildOverride(
  escopoTipo: "TENANT" | "AMBIENTE" | "USUARIO",
  escopoValor: string,
  ativo: boolean,
) {
  return FeatureFlagOverride.create({
    id: `o-${escopoTipo}-${escopoValor}`,
    featureFlagId: "f1",
    escopoTipo,
    escopoValor,
    ativo,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe("FeatureFlagResolver", () => {
  it("usa ativoPadrao quando não há nenhum override", () => {
    const resultado = FeatureFlagResolver.resolver(buildFlag(true), [], {});
    expect(resultado).toEqual({ ativo: true, origem: "PADRAO" });
  });

  it("override de ambiente vence o ativoPadrao", () => {
    const resultado = FeatureFlagResolver.resolver(
      buildFlag(false),
      [buildOverride("AMBIENTE", "staging", true)],
      { ambiente: "staging" },
    );
    expect(resultado).toEqual({ ativo: true, origem: "AMBIENTE" });
  });

  it("override de tenant vence o de ambiente", () => {
    const overrides = [
      buildOverride("AMBIENTE", "production", true),
      buildOverride("TENANT", "tenant-a", false),
    ];
    const resultado = FeatureFlagResolver.resolver(buildFlag(true), overrides, {
      ambiente: "production",
      tenantId: "tenant-a",
    });
    expect(resultado).toEqual({ ativo: false, origem: "TENANT" });
  });

  it("override de usuário vence tenant e ambiente — maior precedência", () => {
    const overrides = [
      buildOverride("AMBIENTE", "production", false),
      buildOverride("TENANT", "tenant-a", false),
      buildOverride("USUARIO", "user-1", true),
    ];
    const resultado = FeatureFlagResolver.resolver(buildFlag(false), overrides, {
      ambiente: "production",
      tenantId: "tenant-a",
      userId: "user-1",
    });
    expect(resultado).toEqual({ ativo: true, origem: "USUARIO" });
  });

  it("ignora overrides de escopos não presentes no contexto avaliado", () => {
    const overrides = [buildOverride("TENANT", "outro-tenant", true)];
    const resultado = FeatureFlagResolver.resolver(buildFlag(false), overrides, {
      tenantId: "tenant-a",
    });
    expect(resultado).toEqual({ ativo: false, origem: "PADRAO" });
  });
});
