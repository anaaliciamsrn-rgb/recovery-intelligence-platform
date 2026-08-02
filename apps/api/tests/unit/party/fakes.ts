/**
 * Fakes em memória para os ports do módulo party — usados pelos testes de
 * use case (application layer), sem dependência real de Postgres. Mesmo
 * padrão de tests/unit/identity/fakes.ts, mas deliberadamente uma cópia
 * própria (não reaproveitada de identity) — os dois módulos não compartilham
 * nada além do middleware de autenticação (ver ADR 0011).
 */
import type { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import type { ParticipacaoSocietaria } from "../../../src/modules/party/domain/entities/ParticipacaoSocietaria.js";
import type { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import type { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import type { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import type { IEmpresaRepository } from "../../../src/modules/party/domain/repositories/IEmpresaRepository.js";
import type { IParticipacaoSocietariaRepository } from "../../../src/modules/party/domain/repositories/IParticipacaoSocietariaRepository.js";
import type { IPessoaRepository } from "../../../src/modules/party/domain/repositories/IPessoaRepository.js";
import type { IClock } from "../../../src/modules/party/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/party/application/ports/IIdGenerator.js";

export class FakePessoaRepository implements IPessoaRepository {
  private readonly pessoasById = new Map<string, Pessoa>();

  async findById(id: string): Promise<Pessoa | null> {
    return this.pessoasById.get(id) ?? null;
  }

  async findByCpf(cpf: CPF): Promise<Pessoa | null> {
    for (const pessoa of this.pessoasById.values()) {
      if (pessoa.cpf.equals(cpf)) return pessoa;
    }
    return null;
  }

  async findAll(): Promise<Pessoa[]> {
    return [...this.pessoasById.values()];
  }

  async save(pessoa: Pessoa): Promise<void> {
    this.pessoasById.set(pessoa.id, pessoa);
  }

  seed(pessoa: Pessoa): void {
    this.pessoasById.set(pessoa.id, pessoa);
  }
}

export class FakeEmpresaRepository implements IEmpresaRepository {
  private readonly empresasById = new Map<string, Empresa>();

  async findById(id: string): Promise<Empresa | null> {
    return this.empresasById.get(id) ?? null;
  }

  async findByCnpj(cnpj: CNPJ): Promise<Empresa | null> {
    for (const empresa of this.empresasById.values()) {
      if (empresa.cnpj.equals(cnpj)) return empresa;
    }
    return null;
  }

  async findAll(): Promise<Empresa[]> {
    return [...this.empresasById.values()];
  }

  async save(empresa: Empresa): Promise<void> {
    this.empresasById.set(empresa.id, empresa);
  }

  seed(empresa: Empresa): void {
    this.empresasById.set(empresa.id, empresa);
  }
}

export class FakeParticipacaoSocietariaRepository implements IParticipacaoSocietariaRepository {
  private readonly participacoesById = new Map<string, ParticipacaoSocietaria>();

  async findById(id: string): Promise<ParticipacaoSocietaria | null> {
    return this.participacoesById.get(id) ?? null;
  }

  async findByPessoaId(pessoaId: string): Promise<ParticipacaoSocietaria[]> {
    return [...this.participacoesById.values()].filter((p) => p.pessoaId === pessoaId);
  }

  async findByEmpresaId(empresaId: string): Promise<ParticipacaoSocietaria[]> {
    return [...this.participacoesById.values()].filter((p) => p.empresaId === empresaId);
  }

  async save(participacao: ParticipacaoSocietaria): Promise<void> {
    this.participacoesById.set(participacao.id, participacao);
  }

  seed(participacao: ParticipacaoSocietaria): void {
    this.participacoesById.set(participacao.id, participacao);
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
