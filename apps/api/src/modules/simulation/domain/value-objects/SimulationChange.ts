import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";

/**
 * Uma mudança hipotética de evidência: "trocar evidência PGFN", "adicionar
 * Receita", "remover CENPROT" são todas a mesma operação mecânica —
 * substituir ou remover o slot de uma fonte — só a intenção humana muda o
 * nome. `REMOVER` volta a fonte para `NAO_CONSULTADO`, algo que o sistema
 * real (`RegistrarEvidenciaUseCase`, ADR 0015) nunca permite fazer — a
 * simulação, sendo hipotética e nunca persistida, pode. Ver ADR 0023.
 */
export interface EvidenciaChangeInput {
  tipo: "EVIDENCIA";
  fonte: DossieFonte;
  acao: "SUBSTITUIR" | "REMOVER";
  /** Obrigatório quando `acao === "SUBSTITUIR"`. */
  status?: "ENCONTRADO" | "NAO_ENCONTRADO" | "ERRO_CONSULTA" | undefined;
  valor?: unknown;
  confidenceScore?: number | undefined;
  motivoErro?: string | undefined;
}

/**
 * Sobrescreve diretamente a confiança computada, sem alterar nenhuma
 * evidência — "e se a confiança aumentar porque mais fontes responderam?"
 * sem precisar simular cada fonte uma a uma.
 */
export interface ConfiancaOverrideChangeInput {
  tipo: "CONFIANCA_OVERRIDE";
  valor: number;
}

/** Sobrescreve diretamente a classe de risco, ignorando o motor de regras — ver ADR 0023 sobre a divergência resultante entre classe e score. */
export interface ClassificacaoOverrideChangeInput {
  tipo: "CLASSIFICACAO_OVERRIDE";
  valor: "BAIXO_RISCO" | "MEDIO_RISCO" | "ALTO_RISCO";
}

export type SimulationChange =
  EvidenciaChangeInput | ConfiancaOverrideChangeInput | ClassificacaoOverrideChangeInput;
