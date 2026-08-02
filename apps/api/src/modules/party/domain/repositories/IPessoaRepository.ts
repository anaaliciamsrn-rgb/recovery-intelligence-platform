import type { Pessoa } from "../entities/Pessoa.js";
import type { CPF } from "../value-objects/CPF.js";

export interface IPessoaRepository {
  findById(id: string): Promise<Pessoa | null>;
  findByCpf(cpf: CPF): Promise<Pessoa | null>;
  /**
   * Sem filtro de busca de propósito — usado hoje só pela resolução de
   * identidade por nome (`PartyByNameIdentitySourceProvider`, ver ADR 0019),
   * que precisa comparar contra todos os cadastros. Não escala para uma base
   * grande de Pessoas; registrado como backlog técnico na ADR 0019.
   */
  findAll(): Promise<Pessoa[]>;
  save(pessoa: Pessoa): Promise<void>;
}
