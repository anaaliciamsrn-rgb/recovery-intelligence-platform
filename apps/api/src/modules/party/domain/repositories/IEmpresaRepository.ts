import type { Empresa } from "../entities/Empresa.js";
import type { CNPJ } from "../value-objects/CNPJ.js";

export interface IEmpresaRepository {
  findById(id: string): Promise<Empresa | null>;
  findByCnpj(cnpj: CNPJ): Promise<Empresa | null>;
  /** Ver comentário equivalente em `IPessoaRepository.findAll` — mesmo motivo, mesma ressalva de escala. */
  findAll(): Promise<Empresa[]>;
  save(empresa: Empresa): Promise<void>;
}
