import {
  InvalidParticipacaoSocietariaError,
  ParticipacaoSocietaria,
} from "../../../src/modules/party/domain/entities/ParticipacaoSocietaria.js";
import { PapelSocietario } from "../../../src/modules/party/domain/value-objects/PapelSocietario.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProps(overrides: Partial<Parameters<typeof ParticipacaoSocietaria.create>[0]> = {}) {
  return {
    id: "participacao-1",
    pessoaId: "pessoa-1",
    empresaId: "empresa-1",
    papel: PapelSocietario.SOCIO,
    percentualParticipacao: null,
    dataEntrada: null,
    dataSaida: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("ParticipacaoSocietaria", () => {
  it("cria uma participação válida sem percentual/datas informados", () => {
    const participacao = ParticipacaoSocietaria.create(buildProps());

    expect(participacao.estaAtiva()).toBe(true);
  });

  it("aceita percentual de participação dentro do intervalo (0, 100]", () => {
    const participacao = ParticipacaoSocietaria.create(buildProps({ percentualParticipacao: 50 }));

    expect(participacao.percentualParticipacao).toBe(50);
  });

  it("rejeita percentual de participação igual a zero", () => {
    expect(() => ParticipacaoSocietaria.create(buildProps({ percentualParticipacao: 0 }))).toThrow(
      InvalidParticipacaoSocietariaError,
    );
  });

  it("rejeita percentual de participação maior que 100", () => {
    expect(() =>
      ParticipacaoSocietaria.create(buildProps({ percentualParticipacao: 100.01 })),
    ).toThrow(InvalidParticipacaoSocietariaError);
  });

  it("rejeita data de saída anterior à data de entrada", () => {
    const dataEntrada = new Date("2026-01-01T00:00:00Z");
    const dataSaida = new Date("2025-01-01T00:00:00Z");

    expect(() => ParticipacaoSocietaria.create(buildProps({ dataEntrada, dataSaida }))).toThrow(
      InvalidParticipacaoSocietariaError,
    );
  });

  it("encerrar() marca a participação como inativa", () => {
    const participacao = ParticipacaoSocietaria.create(buildProps());

    participacao.encerrar(NOW, NOW);

    expect(participacao.estaAtiva()).toBe(false);
    expect(participacao.dataSaida).toEqual(NOW);
  });

  it("encerrar() rejeita data de saída anterior à data de entrada", () => {
    const dataEntrada = new Date("2026-06-01T00:00:00Z");
    const participacao = ParticipacaoSocietaria.create(buildProps({ dataEntrada }));

    expect(() => participacao.encerrar(new Date("2026-01-01T00:00:00Z"), NOW)).toThrow(
      InvalidParticipacaoSocietariaError,
    );
  });
});
