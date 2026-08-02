import { AppError } from "../../../src/application/errors/AppError.js";
import { RegisterParticipacaoSocietariaUseCase } from "../../../src/modules/party/application/use-cases/RegisterParticipacaoSocietariaUseCase.js";
import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { PapelSocietario } from "../../../src/modules/party/domain/value-objects/PapelSocietario.js";
import {
  FakeClock,
  FakeEmpresaRepository,
  FakeIdGenerator,
  FakeParticipacaoSocietariaRepository,
  FakePessoaRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildUseCase() {
  const participacaoRepository = new FakeParticipacaoSocietariaRepository();
  const pessoaRepository = new FakePessoaRepository();
  const empresaRepository = new FakeEmpresaRepository();
  const idGenerator = new FakeIdGenerator();
  const clock = new FakeClock(NOW);

  pessoaRepository.seed(
    Pessoa.create({
      id: "pessoa-1",
      cpf: CPF.create("52998224725"),
      nome: "Ana",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  empresaRepository.seed(
    Empresa.create({
      id: "empresa-1",
      cnpj: CNPJ.create("11222333000181"),
      razaoSocial: "Empresa Ltda",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  const useCase = new RegisterParticipacaoSocietariaUseCase(
    participacaoRepository,
    pessoaRepository,
    empresaRepository,
    idGenerator,
    clock,
  );

  return { useCase, participacaoRepository };
}

describe("RegisterParticipacaoSocietariaUseCase", () => {
  it("registra uma participação societária quando pessoa e empresa existem", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      pessoaId: "pessoa-1",
      empresaId: "empresa-1",
      papel: PapelSocietario.SOCIO_ADMINISTRADOR,
      percentualParticipacao: 60,
      dataEntrada: NOW,
    });

    expect(result.id).toBeDefined();
    expect(result.pessoaId).toBe("pessoa-1");
    expect(result.empresaId).toBe("empresa-1");
    expect(result.papel).toBe("SOCIO_ADMINISTRADOR");
    expect(result.percentualParticipacao).toBe(60);
  });

  it("rejeita quando o pessoaId não corresponde a nenhuma pessoa cadastrada", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        pessoaId: "pessoa-inexistente",
        empresaId: "empresa-1",
        papel: PapelSocietario.SOCIO,
        percentualParticipacao: null,
        dataEntrada: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });

  it("rejeita quando o empresaId não corresponde a nenhuma empresa cadastrada", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        pessoaId: "pessoa-1",
        empresaId: "empresa-inexistente",
        papel: PapelSocietario.SOCIO,
        percentualParticipacao: null,
        dataEntrada: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });

  it("rejeita percentual de participação fora do intervalo válido", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        pessoaId: "pessoa-1",
        empresaId: "empresa-1",
        papel: PapelSocietario.SOCIO,
        percentualParticipacao: 150,
        dataEntrada: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });
});
