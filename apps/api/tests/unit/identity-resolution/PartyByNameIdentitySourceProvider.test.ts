import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { PartyByNameIdentitySourceProvider } from "../../../src/modules/identity-resolution/infrastructure/PartyByNameIdentitySourceProvider.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProvider() {
  const pessoaRepository = new FakePessoaRepository();
  const empresaRepository = new FakeEmpresaRepository();
  pessoaRepository.seed(
    Pessoa.create({
      id: "pessoa-1",
      cpf: CPF.create("52998224725"),
      nome: "ANA ALICIA SOUZA",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  pessoaRepository.seed(
    Pessoa.create({
      id: "pessoa-2",
      cpf: CPF.create("11144477735"),
      nome: "JOAO PEREIRA LIMA",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  empresaRepository.seed(
    Empresa.create({
      id: "empresa-1",
      cnpj: CNPJ.create("11222333000181"),
      razaoSocial: "ANA COMERCIO LTDA",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  return new PartyByNameIdentitySourceProvider(pessoaRepository, empresaRepository);
}

describe("PartyByNameIdentitySourceProvider", () => {
  it("devolve candidatos cujo nome tem alguma sobreposição de tokens com a query", async () => {
    const provider = buildProvider();

    const candidatos = await provider.findCandidates({
      documento: "***.982.247-**",
      nome: "ANA ALICIA",
    });

    const ids = candidatos.map((c) => c.id);
    expect(ids).toContain("pessoa-1");
    expect(ids).toContain("empresa-1");
    expect(ids).not.toContain("pessoa-2");
  });

  it("devolve lista vazia quando a query não tem nome", async () => {
    const provider = buildProvider();

    const candidatos = await provider.findCandidates({ documento: "***.982.247-**", nome: null });

    expect(candidatos).toEqual([]);
  });

  it("devolve lista vazia quando nenhum nome cadastrado tem sobreposição", async () => {
    const provider = buildProvider();

    const candidatos = await provider.findCandidates({
      documento: "***.982.247-**",
      nome: "CARLOS EDUARDO",
    });

    expect(candidatos).toEqual([]);
  });
});
