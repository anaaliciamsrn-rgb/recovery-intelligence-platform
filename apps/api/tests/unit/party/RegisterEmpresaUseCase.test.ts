import { AppError } from "../../../src/application/errors/AppError.js";
import { RegisterEmpresaUseCase } from "../../../src/modules/party/application/use-cases/RegisterEmpresaUseCase.js";
import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { FakeClock, FakeEmpresaRepository, FakeIdGenerator } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const VALID_CNPJ = "11222333000181";

function buildUseCase() {
  const empresaRepository = new FakeEmpresaRepository();
  const idGenerator = new FakeIdGenerator();
  const clock = new FakeClock(NOW);
  const useCase = new RegisterEmpresaUseCase(empresaRepository, idGenerator, clock);

  return { useCase, empresaRepository };
}

describe("RegisterEmpresaUseCase", () => {
  it("registra uma empresa com CNPJ válido", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      cnpj: VALID_CNPJ,
      razaoSocial: "Recovery Intelligence Ltda",
    });

    expect(result.id).toBeDefined();
    expect(result.cnpj).toBe(VALID_CNPJ);
    expect(result.razaoSocial).toBe("Recovery Intelligence Ltda");
    expect(result.createdAt).toEqual(NOW);
  });

  it("persiste a empresa registrada no repositório", async () => {
    const { useCase, empresaRepository } = buildUseCase();

    await useCase.execute({ cnpj: VALID_CNPJ, razaoSocial: "Recovery Intelligence Ltda" });

    const saved = await empresaRepository.findByCnpj(CNPJ.create(VALID_CNPJ));
    expect(saved).not.toBeNull();
    expect(saved?.razaoSocial).toBe("Recovery Intelligence Ltda");
  });

  it("rejeita CNPJ com formato/dígito verificador inválido", async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ cnpj: "123", razaoSocial: "Empresa" })).rejects.toMatchObject({
      kind: "VALIDATION",
    } satisfies Partial<AppError>);
  });

  it("rejeita registro duplicado do mesmo CNPJ", async () => {
    const { useCase, empresaRepository } = buildUseCase();
    empresaRepository.seed(
      Empresa.create({
        id: "existing-1",
        cnpj: CNPJ.create(VALID_CNPJ),
        razaoSocial: "Já Cadastrada Ltda",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    await expect(
      useCase.execute({ cnpj: VALID_CNPJ, razaoSocial: "Outra Empresa Ltda" }),
    ).rejects.toMatchObject({ kind: "CONFLICT" } satisfies Partial<AppError>);
  });
});
