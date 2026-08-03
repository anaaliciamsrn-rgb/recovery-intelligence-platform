import type {
  IReceitaFederalProvider,
  ReceitaFederalLookupResult,
} from "../application/ports/IReceitaFederalProvider.js";

const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api/cnpj/v1";
const TIMEOUT_MS = 8_000;

/** Formato bruto documentado da BrasilAPI (proxy público e gratuito para o cadastro real da Receita Federal) — só os campos que este provider usa. */
interface BrasilApiCnpjResponse {
  descricao_situacao_cadastral: string;
  razao_social: string;
  nome_fantasia: string | null;
  natureza_juridica: string;
  capital_social: number;
  cnae_fiscal_descricao: string | null;
  data_inicio_atividade: string | null;
  municipio: string | null;
  uf: string | null;
}

/**
 * Única das cinco fontes do Dossiê que consulta um serviço externo real
 * (ver ADR 0037) — as outras quatro (PGFN/DataJud/Portal da
 * Transparência/CENPROT) continuam simuladas porque não existe API
 * pública e gratuita equivalente para elas. BrasilAPI é um proxy público
 * de código aberto para o cadastro real da Receita Federal — não é a
 * Receita Federal diretamente, mas os dados vêm da base oficial.
 *
 * CNPJs fictícios (ex.: os da planilha demo, ADR 0037) legitimamente
 * devolvem `NAO_ENCONTRADO` aqui, porque de fato não existem no cadastro
 * real — isso é o comportamento correto, não um bug: dado fictício
 * consultado contra uma fonte real não pode aparecer como encontrado.
 */
export class BrasilApiReceitaFederalProvider implements IReceitaFederalProvider {
  async consultar(cnpj: string): Promise<ReceitaFederalLookupResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BRASIL_API_BASE_URL}/${cnpj}`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "recovery-intelligence-platform/1.0 (+https://brasilapi.com.br/api)",
        },
      });

      if (response.status === 404) {
        return { status: "NAO_ENCONTRADO" };
      }
      if (response.status === 429) {
        return {
          status: "ERRO_CONSULTA",
          motivoErro: "Limite de requisições da BrasilAPI excedido — tente novamente em breve",
        };
      }
      if (!response.ok) {
        return {
          status: "ERRO_CONSULTA",
          motivoErro: `BrasilAPI respondeu ${response.status} ao consultar o CNPJ`,
        };
      }

      const body = (await response.json()) as BrasilApiCnpjResponse;
      return {
        status: "ENCONTRADO",
        valor: {
          situacaoCadastral: body.descricao_situacao_cadastral,
          razaoSocial: body.razao_social,
          nomeFantasia: body.nome_fantasia,
          naturezaJuridica: body.natureza_juridica,
          capitalSocial: body.capital_social,
          cnaePrincipal: body.cnae_fiscal_descricao,
          dataInicioAtividade: body.data_inicio_atividade,
          municipio: body.municipio,
          uf: body.uf,
        },
      };
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === "AbortError"
          ? "Tempo limite excedido ao consultar a BrasilAPI"
          : "Falha de rede ao consultar a BrasilAPI";
      return { status: "ERRO_CONSULTA", motivoErro: motivo };
    } finally {
      clearTimeout(timeout);
    }
  }
}
