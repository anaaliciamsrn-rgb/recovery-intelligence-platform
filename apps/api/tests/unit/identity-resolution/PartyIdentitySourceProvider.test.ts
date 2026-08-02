import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { PartyIdentitySourceProvider } from "../../../src/modules/identity-resolution/infrastructure/PartyIdentitySourceProvider.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProvider() {
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

  return new PartyIdentitySourceProvider(pessoaRepository, empresaRepository);
}

describe("PartyIdentitySourceProvider", () => {
  it("encontra um candidato Pessoa quando o documento é um CPF cadastrado", async () => {
    const provider = buildProvider();

    const candidates = await provider.findCandidates({ documento: "52998224725", nome: null });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBe("pessoa-1");
    expect(candidates[0]?.sourceType).toBe("INTERNAL");
  });

  it("encontra um candidato Empresa quando o documento é um CNPJ cadastrado", async () => {
    const provider = buildProvider();

    const candidates = await provider.findCandidates({ documento: "11222333000181", nome: null });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBe("empresa-1");
  });

  it("devolve lista vazia quando o documento não está cadastrado nem é válido", async () => {
    const provider = buildProvider();

    const candidates = await provider.findCandidates({ documento: "123", nome: null });

    expect(candidates).toEqual([]);
  });
});
