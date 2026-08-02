import { AppError } from "../../../src/application/errors/AppError.js";
import { GetPessoaByCpfUseCase } from "../../../src/modules/party/application/use-cases/GetPessoaByCpfUseCase.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { FakePessoaRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const VALID_CPF = "52998224725";

describe("GetPessoaByCpfUseCase", () => {
  it("retorna a pessoa quando o CPF está cadastrado", async () => {
    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "pessoa-1",
        cpf: CPF.create(VALID_CPF),
        nome: "Ana Alícia",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const useCase = new GetPessoaByCpfUseCase(pessoaRepository);

    const result = await useCase.execute(VALID_CPF);

    expect(result.id).toBe("pessoa-1");
    expect(result.nome).toBe("Ana Alícia");
  });

  it("lança NOT_FOUND quando o CPF não está cadastrado", async () => {
    const useCase = new GetPessoaByCpfUseCase(new FakePessoaRepository());

    await expect(useCase.execute(VALID_CPF)).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  it("lança VALIDATION quando o CPF informado é malformado", async () => {
    const useCase = new GetPessoaByCpfUseCase(new FakePessoaRepository());

    await expect(useCase.execute("123")).rejects.toMatchObject({
      kind: "VALIDATION",
    } satisfies Partial<AppError>);
  });
});
