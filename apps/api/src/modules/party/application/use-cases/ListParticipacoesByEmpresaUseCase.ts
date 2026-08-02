import type { ParticipacaoSocietaria } from "../../domain/entities/ParticipacaoSocietaria.js";
import type { PapelSocietario } from "../../domain/value-objects/PapelSocietario.js";
import type { IParticipacaoSocietariaRepository } from "../../domain/repositories/IParticipacaoSocietariaRepository.js";

export interface ParticipacaoSocietariaOutput {
  id: string;
  pessoaId: string;
  empresaId: string;
  papel: PapelSocietario;
  percentualParticipacao: number | null;
  dataEntrada: Date | null;
  dataSaida: Date | null;
}

export class ListParticipacoesByEmpresaUseCase {
  constructor(private readonly participacaoRepository: IParticipacaoSocietariaRepository) {}

  async execute(empresaId: string): Promise<ParticipacaoSocietariaOutput[]> {
    const participacoes = await this.participacaoRepository.findByEmpresaId(empresaId);
    return participacoes.map(toOutput);
  }
}

function toOutput(participacao: ParticipacaoSocietaria): ParticipacaoSocietariaOutput {
  return {
    id: participacao.id,
    pessoaId: participacao.pessoaId,
    empresaId: participacao.empresaId,
    papel: participacao.papel,
    percentualParticipacao: participacao.percentualParticipacao,
    dataEntrada: participacao.dataEntrada,
    dataSaida: participacao.dataSaida,
  };
}
