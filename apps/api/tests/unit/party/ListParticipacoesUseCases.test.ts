import { ListParticipacoesByEmpresaUseCase } from "../../../src/modules/party/application/use-cases/ListParticipacoesByEmpresaUseCase.js";
import { ListParticipacoesByPessoaUseCase } from "../../../src/modules/party/application/use-cases/ListParticipacoesByPessoaUseCase.js";
import { ParticipacaoSocietaria } from "../../../src/modules/party/domain/entities/ParticipacaoSocietaria.js";
import { PapelSocietario } from "../../../src/modules/party/domain/value-objects/PapelSocietario.js";
import { FakeParticipacaoSocietariaRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function seedParticipacao(
  repository: FakeParticipacaoSocietariaRepository,
  overrides: { id: string; pessoaId: string; empresaId: string },
): void {
  repository.seed(
    ParticipacaoSocietaria.create({
      papel: PapelSocietario.SOCIO,
      percentualParticipacao: null,
      dataEntrada: null,
      dataSaida: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    }),
  );
}

describe("ListParticipacoesByEmpresaUseCase", () => {
  it("lista só as participações da empresa informada", async () => {
    const repository = new FakeParticipacaoSocietariaRepository();
    seedParticipacao(repository, { id: "p1", pessoaId: "pessoa-1", empresaId: "empresa-1" });
    seedParticipacao(repository, { id: "p2", pessoaId: "pessoa-2", empresaId: "empresa-2" });
    const useCase = new ListParticipacoesByEmpresaUseCase(repository);

    const result = await useCase.execute("empresa-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.pessoaId).toBe("pessoa-1");
  });
});

describe("ListParticipacoesByPessoaUseCase", () => {
  it("lista só as participações da pessoa informada", async () => {
    const repository = new FakeParticipacaoSocietariaRepository();
    seedParticipacao(repository, { id: "p1", pessoaId: "pessoa-1", empresaId: "empresa-1" });
    seedParticipacao(repository, { id: "p2", pessoaId: "pessoa-1", empresaId: "empresa-2" });
    seedParticipacao(repository, { id: "p3", pessoaId: "pessoa-2", empresaId: "empresa-1" });
    const useCase = new ListParticipacoesByPessoaUseCase(repository);

    const result = await useCase.execute("pessoa-1");

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.empresaId).sort()).toEqual(["empresa-1", "empresa-2"]);
  });
});
