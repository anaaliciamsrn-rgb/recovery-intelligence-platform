import { AppError } from "../../../src/application/errors/AppError.js";
import { GetEmpresaByCnpjUseCase } from "../../../src/modules/party/application/use-cases/GetEmpresaByCnpjUseCase.js";
import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { FakeEmpresaRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const VALID_CNPJ = "11222333000181";

describe("GetEmpresaByCnpjUseCase", () => {
  it("retorna a empresa quando o CNPJ está cadastrado", async () => {
    const empresaRepository = new FakeEmpresaRepository();
    empresaRepository.seed(
      Empresa.create({
        id: "empresa-1",
        cnpj: CNPJ.create(VALID_CNPJ),
        razaoSocial: "Recovery Intelligence Ltda",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const useCase = new GetEmpresaByCnpjUseCase(empresaRepository);

    const result = await useCase.execute(VALID_CNPJ);

    expect(result.id).toBe("empresa-1");
    expect(result.razaoSocial).toBe("Recovery Intelligence Ltda");
  });

  it("lança NOT_FOUND quando o CNPJ não está cadastrado", async () => {
    const useCase = new GetEmpresaByCnpjUseCase(new FakeEmpresaRepository());

    await expect(useCase.execute(VALID_CNPJ)).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  it("lança VALIDATION quando o CNPJ informado é malformado", async () => {
    const useCase = new GetEmpresaByCnpjUseCase(new FakeEmpresaRepository());

    await expect(useCase.execute("123")).rejects.toMatchObject({
      kind: "VALIDATION",
    } satisfies Partial<AppError>);
  });
});
