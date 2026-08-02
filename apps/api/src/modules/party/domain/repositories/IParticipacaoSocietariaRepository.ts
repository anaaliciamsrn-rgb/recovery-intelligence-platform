import type { ParticipacaoSocietaria } from "../entities/ParticipacaoSocietaria.js";

export interface IParticipacaoSocietariaRepository {
  findById(id: string): Promise<ParticipacaoSocietaria | null>;
  findByPessoaId(pessoaId: string): Promise<ParticipacaoSocietaria[]>;
  findByEmpresaId(empresaId: string): Promise<ParticipacaoSocietaria[]>;
  save(participacao: ParticipacaoSocietaria): Promise<void>;
}
