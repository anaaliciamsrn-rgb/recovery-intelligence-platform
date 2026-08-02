import {
  FeatureFlag,
  InvalidFeatureFlagError,
} from "../../../src/modules/feature-flags/domain/entities/FeatureFlag.js";
import {
  FeatureFlagOverride,
  InvalidFeatureFlagOverrideError,
} from "../../../src/modules/feature-flags/domain/entities/FeatureFlagOverride.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("FeatureFlag", () => {
  it("cria uma flag válida", () => {
    const flag = FeatureFlag.create({
      id: "f1",
      chave: "case-management.notes",
      descricao: null,
      ativoPadrao: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(flag.chave).toBe("case-management.notes");
    expect(flag.ativoPadrao).toBe(false);
  });

  it("rejeita chave com caracteres inválidos", () => {
    expect(() =>
      FeatureFlag.create({
        id: "f1",
        chave: "Case Management",
        descricao: null,
        ativoPadrao: false,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow(InvalidFeatureFlagError);
  });

  it("atualizar() altera descricao/ativoPadrao e updatedAt", () => {
    const flag = FeatureFlag.create({
      id: "f1",
      chave: "modulo-x",
      descricao: null,
      ativoPadrao: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const depois = new Date("2026-01-02T00:00:00Z");

    flag.atualizar({ descricao: "agora documentada", ativoPadrao: true }, depois);

    expect(flag.descricao).toBe("agora documentada");
    expect(flag.ativoPadrao).toBe(true);
    expect(flag.updatedAt).toEqual(depois);
  });
});

describe("FeatureFlagOverride", () => {
  it("cria um override válido", () => {
    const override = FeatureFlagOverride.create({
      id: "o1",
      featureFlagId: "f1",
      escopoTipo: "TENANT",
      escopoValor: "tenant-a",
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(override.ativo).toBe(true);
  });

  it("rejeita escopoValor vazio", () => {
    expect(() =>
      FeatureFlagOverride.create({
        id: "o1",
        featureFlagId: "f1",
        escopoTipo: "TENANT",
        escopoValor: "  ",
        ativo: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow(InvalidFeatureFlagOverrideError);
  });

  it("atualizarAtivo() muda o valor e updatedAt", () => {
    const override = FeatureFlagOverride.create({
      id: "o1",
      featureFlagId: "f1",
      escopoTipo: "USUARIO",
      escopoValor: "user-1",
      ativo: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const depois = new Date("2026-01-02T00:00:00Z");

    override.atualizarAtivo(true, depois);

    expect(override.ativo).toBe(true);
    expect(override.updatedAt).toEqual(depois);
  });
});
