import { ResolveIdentityUseCase } from "../../../src/modules/identity-resolution/application/use-cases/ResolveIdentityUseCase.js";
import { ExactDocumentMatchStrategy } from "../../../src/modules/identity-resolution/infrastructure/ExactDocumentMatchStrategy.js";
import { FakeAlwaysFavorableStrategy, FakeIdentityResolutionSourceProvider } from "./fakes.js";

describe("ResolveIdentityUseCase", () => {
  it("agrega candidatos de múltiplas fontes num único resultado ordenado", async () => {
    const internalProvider = new FakeIdentityResolutionSourceProvider("INTERNAL", [
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana" },
    ]);
    const externalProvider = new FakeIdentityResolutionSourceProvider("RECEITA_FEDERAL", [
      { id: "c2", sourceType: "RECEITA_FEDERAL", documento: "11144477735", nome: "Outra Pessoa" },
    ]);
    const useCase = new ResolveIdentityUseCase(
      [internalProvider, externalProvider],
      new ExactDocumentMatchStrategy(),
    );

    const results = await useCase.execute({ documento: "52998224725", nome: null });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.candidateId)).toEqual(expect.arrayContaining(["c1", "c2"]));
  });

  it("ordena os resultados por confiança decrescente", async () => {
    const provider = new FakeIdentityResolutionSourceProvider("INTERNAL", [
      { id: "match-exato", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana" },
      { id: "sem-match", sourceType: "INTERNAL", documento: "11144477735", nome: "Outra" },
    ]);
    const useCase = new ResolveIdentityUseCase([provider], new ExactDocumentMatchStrategy());

    const results = await useCase.execute({ documento: "52998224725", nome: null });

    expect(results[0]?.candidateId).toBe("match-exato");
    expect(results[0]?.decision).toBe("MATCH");
    expect(results[1]?.candidateId).toBe("sem-match");
    expect(results[1]?.decision).toBe("NO_MATCH");
  });

  it("funciona com nenhuma fonte configurada (retorna lista vazia)", async () => {
    const useCase = new ResolveIdentityUseCase([], new FakeAlwaysFavorableStrategy());

    const results = await useCase.execute({ documento: "52998224725", nome: null });

    expect(results).toEqual([]);
  });

  it("deduplica o mesmo candidato sugerido por mais de uma fonte", async () => {
    const providerA = new FakeIdentityResolutionSourceProvider("INTERNAL", [
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana" },
    ]);
    const providerB = new FakeIdentityResolutionSourceProvider("INTERNAL", [
      { id: "c1", sourceType: "INTERNAL", documento: "52998224725", nome: "Ana" },
    ]);
    const useCase = new ResolveIdentityUseCase(
      [providerA, providerB],
      new ExactDocumentMatchStrategy(),
    );

    const results = await useCase.execute({ documento: "52998224725", nome: null });

    expect(results).toHaveLength(1);
  });
});
