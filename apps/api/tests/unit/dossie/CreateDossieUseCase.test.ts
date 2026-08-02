import { AppError } from "../../../src/application/errors/AppError.js";
import { CreateDossieUseCase } from "../../../src/modules/dossie/application/use-cases/CreateDossieUseCase.js";
import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";
import { FakeClock, FakeDossieRepository, FakeIdGenerator } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildUseCase() {
  const dossieRepository = new FakeDossieRepository();
  const pessoaRepository = new FakePessoaRepository();
  const empresaRepository = new FakeEmpresaRepository();
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

  const useCase = new CreateDossieUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );

  return { useCase, dossieRepository };
}

describe("CreateDossieUseCase", () => {
  it("cria um dossiê para uma Pessoa existente", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ subjectType: "PESSOA", subjectId: "pessoa-1" });

    expect(result.id).toBeDefined();
    expect(result.subjectType).toBe("PESSOA");
    expect(result.subjectId).toBe("pessoa-1");
  });

  it("cria um dossiê para uma Empresa existente", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ subjectType: "EMPRESA", subjectId: "empresa-1" });

    expect(result.subjectType).toBe("EMPRESA");
    expect(result.subjectId).toBe("empresa-1");
  });

  it("persiste o dossiê já com todas as evidências NAO_CONSULTADO", async () => {
    const { useCase, dossieRepository } = buildUseCase();

    const result = await useCase.execute({ subjectType: "PESSOA", subjectId: "pessoa-1" });

    const saved = await dossieRepository.findById(result.id);
    expect(saved?.evidencias.pgfn.status).toBe("NAO_CONSULTADO");
  });

  it("rejeita quando a Pessoa referenciada não existe", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ subjectType: "PESSOA", subjectId: "pessoa-inexistente" }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });

  it("rejeita quando a Empresa referenciada não existe", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ subjectType: "EMPRESA", subjectId: "empresa-inexistente" }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });
});
