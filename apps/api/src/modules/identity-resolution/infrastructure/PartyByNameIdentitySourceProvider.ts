import type { IEmpresaRepository } from "../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../party/domain/repositories/IPessoaRepository.js";
import { IdentitySourceType } from "../domain/value-objects/IdentitySourceType.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
  IIdentityResolutionSourceProvider,
} from "../application/ports/IIdentityResolutionSourceProvider.js";
import { nameSimilarity } from "./nameSimilarity.js";

/**
 * Segunda fonte real dentro de `party`, complementar a
 * `PartyIdentitySourceProvider` (que só encontra candidato por documento
 * completo idêntico). Esta existe para o caso de a query trazer um
 * documento incompleto/mascarado (ex.: `***.982.247-**`, ver ADR 0019) — aí
 * a única forma de sugerir candidatos é buscar por nome. Varre todos os
 * cadastros (`findAll`); não escala para uma base grande, backlog técnico
 * registrado na ADR 0019.
 */
export class PartyByNameIdentitySourceProvider implements IIdentityResolutionSourceProvider {
  readonly sourceType = IdentitySourceType.INTERNAL;

  constructor(
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async findCandidates(query: IdentityResolutionQuery): Promise<IdentityResolutionCandidate[]> {
    if (!query.nome) return [];

    const [pessoas, empresas] = await Promise.all([
      this.pessoaRepository.findAll(),
      this.empresaRepository.findAll(),
    ]);

    const pessoaCandidates: IdentityResolutionCandidate[] = pessoas
      .filter((pessoa) => nameSimilarity(pessoa.nome, query.nome ?? "") > 0)
      .map((pessoa) => ({
        id: pessoa.id,
        sourceType: this.sourceType,
        documento: pessoa.cpf.toString(),
        nome: pessoa.nome,
      }));

    const empresaCandidates: IdentityResolutionCandidate[] = empresas
      .filter((empresa) => nameSimilarity(empresa.razaoSocial, query.nome ?? "") > 0)
      .map((empresa) => ({
        id: empresa.id,
        sourceType: this.sourceType,
        documento: empresa.cnpj.toString(),
        nome: empresa.razaoSocial,
      }));

    return [...pessoaCandidates, ...empresaCandidates];
  }
}
