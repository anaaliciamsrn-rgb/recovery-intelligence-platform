import type { PapelSocietario } from "../../../party/domain/value-objects/PapelSocietario.js";

/**
 * Sócio/administrador fictício gerado pela "IA de demonstração" (ver ADR
 * 0037) — nunca uma consulta real ao QSA da Receita Federal.
 * `percentualParticipacao: null` representa um administrador sem
 * participação societária própria (contratado, não sócio).
 */
export interface SimulatedSocio {
  nome: string;
  cpf: string;
  papel: PapelSocietario;
  percentualParticipacao: number | null;
}

/**
 * Porta para a simulação de estrutura societária de uma Empresa importada —
 * mesmo espírito de `IEmpresaEvidenceSimulator` (isolada como porta para
 * nunca ser confundida com uma integração real). `responsavel` (coluna da
 * planilha) é usado como o sócio-administrador principal quando presente,
 * nunca descartado.
 */
export interface IEmpresaOwnershipSimulator {
  simulate(cnpj: string, responsavel: string | null): SimulatedSocio[];
}
