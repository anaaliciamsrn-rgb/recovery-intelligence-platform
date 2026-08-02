import { CNPJ, InvalidCnpjError } from "../../party/domain/value-objects/CNPJ.js";
import { CPF, InvalidCpfError } from "../../party/domain/value-objects/CPF.js";
import type { IEmpresaRepository } from "../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../party/domain/repositories/IPessoaRepository.js";
import { IdentitySourceType } from "../domain/value-objects/IdentitySourceType.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
  IIdentityResolutionSourceProvider,
} from "../application/ports/IIdentityResolutionSourceProvider.js";

/**
 * Única fonte com implementação real nesta fase: os cadastros já existentes
 * de `Pessoa`/`Empresa` (módulo `party`). Depende de `party` (upstream, não
 * o contrário) — `party` nunca sabe que `identity-resolution` existe. Ver
 * ADR 0013.
 */
export class PartyIdentitySourceProvider implements IIdentityResolutionSourceProvider {
  readonly sourceType = IdentitySourceType.INTERNAL;

  constructor(
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async findCandidates(query: IdentityResolutionQuery): Promise<IdentityResolutionCandidate[]> {
    const pessoaCandidate = await this.findPessoaCandidate(query.documento);
    if (pessoaCandidate) return [pessoaCandidate];

    const empresaCandidate = await this.findEmpresaCandidate(query.documento);
    if (empresaCandidate) return [empresaCandidate];

    return [];
  }

  private async findPessoaCandidate(
    documento: string,
  ): Promise<IdentityResolutionCandidate | null> {
    let cpf: CPF;
    try {
      cpf = CPF.create(documento);
    } catch (error) {
      if (error instanceof InvalidCpfError) return null;
      throw error;
    }

    const pessoa = await this.pessoaRepository.findByCpf(cpf);
    if (!pessoa) return null;

    return {
      id: pessoa.id,
      sourceType: this.sourceType,
      documento: pessoa.cpf.toString(),
      nome: pessoa.nome,
    };
  }

  private async findEmpresaCandidate(
    documento: string,
  ): Promise<IdentityResolutionCandidate | null> {
    let cnpj: CNPJ;
    try {
      cnpj = CNPJ.create(documento);
    } catch (error) {
      if (error instanceof InvalidCnpjError) return null;
      throw error;
    }

    const empresa = await this.empresaRepository.findByCnpj(cnpj);
    if (!empresa) return null;

    return {
      id: empresa.id,
      sourceType: this.sourceType,
      documento: empresa.cnpj.toString(),
      nome: empresa.razaoSocial,
    };
  }
}
