import { AppError } from "../../../src/application/errors/AppError.js";
import { RegisterPessoaUseCase } from "../../../src/modules/party/application/use-cases/RegisterPessoaUseCase.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { FakeClock, FakeIdGenerator, FakePessoaRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const VALID_CPF = "52998224725";

function buildUseCase() {
  const pessoaRepository = new FakePessoaRepository();
  const idGenerator = new FakeIdGenerator();
  const clock = new FakeClock(NOW);
  const useCase = new RegisterPessoaUseCase(pessoaRepository, idGenerator, clock);

  return { useCase, pessoaRepository };
}

describe("RegisterPessoaUseCase", () => {
  it("registra uma pessoa com CPF válido", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ cpf: VALID_CPF, nome: "Ana Alícia" });

    expect(result.id).toBeDefined();
    expect(result.cpf).toBe(VALID_CPF);
    expect(result.nome).toBe("Ana Alícia");
    expect(result.createdAt).toEqual(NOW);
    expect(result.updatedAt).toEqual(NOW);
  });

  it("persiste a pessoa registrada no repositório", async () => {
    const { useCase, pessoaRepository } = buildUseCase();

    await useCase.execute({ cpf: VALID_CPF, nome: "Ana Alícia" });

    const saved = await pessoaRepository.findByCpf(CPF.create(VALID_CPF));
    expect(saved).not.toBeNull();
    expect(saved?.nome).toBe("Ana Alícia");
  });

  it("rejeita CPF com formato/dígito verificador inválido", async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ cpf: "123", nome: "Ana Alícia" })).rejects.toMatchObject({
      kind: "VALIDATION",
    } satisfies Partial<AppError>);
  });

  it("rejeita registro duplicado do mesmo CPF", async () => {
    const { useCase, pessoaRepository } = buildUseCase();
    pessoaRepository.seed(
      Pessoa.create({
        id: "existing-1",
        cpf: CPF.create(VALID_CPF),
        nome: "Já Cadastrada",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    await expect(useCase.execute({ cpf: VALID_CPF, nome: "Outra Pessoa" })).rejects.toMatchObject({
      kind: "CONFLICT",
    } satisfies Partial<AppError>);
  });
});
