import { AppError } from "../../../src/application/errors/AppError.js";
import { EncerrarParticipacaoSocietariaUseCase } from "../../../src/modules/party/application/use-cases/EncerrarParticipacaoSocietariaUseCase.js";
import { ParticipacaoSocietaria } from "../../../src/modules/party/domain/entities/ParticipacaoSocietaria.js";
import { PapelSocietario } from "../../../src/modules/party/domain/value-objects/PapelSocietario.js";
import { FakeClock, FakeParticipacaoSocietariaRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("EncerrarParticipacaoSocietariaUseCase", () => {
  it("encerra uma participação ativa", async () => {
    const participacaoRepository = new FakeParticipacaoSocietariaRepository();
    participacaoRepository.seed(
      ParticipacaoSocietaria.create({
        id: "participacao-1",
        pessoaId: "pessoa-1",
        empresaId: "empresa-1",
        papel: PapelSocietario.SOCIO,
        percentualParticipacao: null,
        dataEntrada: null,
        dataSaida: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const useCase = new EncerrarParticipacaoSocietariaUseCase(
      participacaoRepository,
      new FakeClock(NOW),
    );

    await useCase.execute({ id: "participacao-1", dataSaida: null });

    const updated = await participacaoRepository.findById("participacao-1");
    expect(updated?.estaAtiva()).toBe(false);
  });

  it("lança NOT_FOUND quando a participação não existe", async () => {
    const useCase = new EncerrarParticipacaoSocietariaUseCase(
      new FakeParticipacaoSocietariaRepository(),
      new FakeClock(NOW),
    );

    await expect(useCase.execute({ id: "inexistente", dataSaida: null })).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
