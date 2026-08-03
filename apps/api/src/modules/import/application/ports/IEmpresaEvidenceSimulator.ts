import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";

/**
 * Formato cru que alimenta `RegistrarEvidenciaUseCase.execute()` diretamente
 * — nunca um `Evidence<T>` já montado (isso é responsabilidade exclusiva do
 * módulo `dossie`, ver ADR 0015). `status` nunca é `NAO_CONSULTADO` aqui:
 * o simulador sempre "consulta" as cinco fontes, é assim que soa uma IA de
 * demonstração convincente — a variedade vem de `ENCONTRADO` vs
 * `NAO_ENCONTRADO` vs (raramente) `ERRO_CONSULTA`, nunca de pular a consulta.
 */
export interface SimulatedEvidence {
  status: "ENCONTRADO" | "NAO_ENCONTRADO" | "ERRO_CONSULTA";
  valor: unknown;
  confidenceScore: number | null;
  motivoErro: string | null;
}

export type SimulatedEvidenceSet = Record<DossieFonte, SimulatedEvidence>;

/**
 * Porta para a "IA de demonstração" que gera evidências plausíveis para as
 * cinco fontes do Dossiê, já que nenhuma integração real com
 * PGFN/DataJud/Receita Federal/Portal da Transparência/CENPROT existe (ver
 * ADR 0015). Isolado como porta — nunca é confundido com uma integração
 * real; qualquer tela que exiba estes dados precisa deixar isso explícito ao
 * usuário. Ver ADR 0037.
 */
export interface IEmpresaEvidenceSimulator {
  simulate(cnpj: string): SimulatedEvidenceSet;
}
