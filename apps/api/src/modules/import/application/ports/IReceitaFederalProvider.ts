/**
 * Consulta REAL à Receita Federal — diferente das outras 4 fontes do
 * Dossiê (PGFN/DataJud/Portal da Transparência/CENPROT), que continuam
 * simuladas porque não existe API pública e gratuita para elas (ver ADR
 * 0037). CNPJ é dado público; CPF de pessoa física não tem fonte pública
 * legal equivalente — por isso este port é só para CNPJ.
 */
export interface ReceitaFederalLookupValue {
  situacaoCadastral: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  naturezaJuridica: string;
  capitalSocial: number;
  cnaePrincipal: string | null;
  dataInicioAtividade: string | null;
  municipio: string | null;
  uf: string | null;
}

export type ReceitaFederalLookupResult =
  | { status: "ENCONTRADO"; valor: ReceitaFederalLookupValue }
  | { status: "NAO_ENCONTRADO" }
  | { status: "ERRO_CONSULTA"; motivoErro: string };

export interface IReceitaFederalProvider {
  consultar(cnpj: string): Promise<ReceitaFederalLookupResult>;
}
