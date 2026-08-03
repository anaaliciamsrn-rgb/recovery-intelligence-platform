import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { AnalyticsSummary } from "../types/api";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingSkeleton } from "../components/ui/States";

const RISK_LABEL: Record<string, string> = {
  BAIXO_RISCO: "Baixo risco",
  MEDIO_RISCO: "Médio risco",
  ALTO_RISCO: "Alto risco",
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** `metricasPorFonte[].percentualRespondida` já vem em escala 0-100 do backend — ver mesmo comentário em `ExecutiveDashboardPage.tsx`. */
function formatAlreadyPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatGeneratedAt(): string {
  return new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * Página dedicada (sem AppShell — ver App.tsx) otimizada para exportação em
 * PDF via impressão nativa do navegador (`window.print()`), estilizada por
 * `@media print` em global.css. Evita depender de uma lib de geração de PDF
 * no servidor: o próprio navegador já sabe paginar HTML/CSS corretamente.
 */
export function ExecutiveReportPage() {
  const { user } = useAuth();
  const { brand } = useTheme();
  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<AnalyticsSummary>("/analytics/summary"),
    [],
  );

  const distribuicaoRisco = data ? Object.entries(data.distribuicaoRisco) : [];
  const totalClassificados = distribuicaoRisco.reduce((sum, [, total]) => sum + total, 0);

  return (
    <div
      className="mx-auto max-w-4xl px-6 py-8"
      style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}
    >
      <div className="no-print mb-6 flex items-center justify-between">
        <Link to="/app" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
          ← Voltar ao dashboard
        </Link>
        <Button onClick={() => window.print()} disabled={isLoading || !data}>
          🖨️ Exportar PDF
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : error || !data ? (
        <ErrorState message={error ?? "Sem dados"} onRetry={reload} code={errorCode} />
      ) : (
        <article className="space-y-8" style={{ color: "var(--color-text)" }}>
          <header
            className="flex items-start justify-between gap-6 border-b pb-6"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <h1 className="text-2xl font-bold">{brand.productName}</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Relatório Executivo de Inteligência de Recuperação de Crédito
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: "var(--color-text-muted)" }}>
              <p>Gerado em {formatGeneratedAt()}</p>
              {user ? <p>por {user.email}</p> : null}
            </div>
          </header>

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Sumário executivo
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ReportStat
                label="Pessoas cadastradas"
                value={data.totalPessoas.toLocaleString("pt-BR")}
              />
              <ReportStat
                label="Empresas cadastradas"
                value={data.totalEmpresas.toLocaleString("pt-BR")}
              />
              <ReportStat
                label="Dossiês analisados"
                value={data.totalDossiesAnalisados.toLocaleString("pt-BR")}
              />
              <ReportStat
                label="Importações processadas"
                value={data.totalImportacoes.toLocaleString("pt-BR")}
              />
              <ReportStat label="Score médio de risco" value={data.scoreMedio.toFixed(1)} />
              <ReportStat
                label="Confiança média das evidências"
                value={formatPercent(data.confiancaMedia)}
              />
            </div>
          </section>

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Distribuição de risco da carteira
            </h2>
            <ReportTable
              headers={["Classificação", "Dossiês", "% da carteira"]}
              rows={distribuicaoRisco.map(([classificacao, total]) => [
                RISK_LABEL[classificacao] ?? classificacao,
                total.toLocaleString("pt-BR"),
                totalClassificados > 0
                  ? `${((total / totalClassificados) * 100).toFixed(1)}%`
                  : "—",
              ])}
              emptyMessage="Nenhum dossiê classificado ainda"
            />
          </section>

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Empresas em maior risco
            </h2>
            <ReportTable
              headers={["Empresa", "Score de risco", "Classificação"]}
              rows={data.empresasEmMaiorRisco.map((empresa) => [
                empresa.nome,
                empresa.riskScore.toFixed(2),
                RISK_LABEL[empresa.classificacao] ?? empresa.classificacao,
              ])}
              emptyMessage="Nenhuma empresa classificada ainda"
            />
          </section>

          {data.alertas.length > 0 ? (
            <section>
              <h2
                className="mb-3 text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Alertas
              </h2>
              <ul className="space-y-1 text-sm" style={{ color: "var(--color-text)" }}>
                {data.alertas.map((alerta, index) => (
                  <li key={index}>⚠️ {alerta}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Canais de contato mais recomendados
            </h2>
            <ReportTable
              headers={["Canal", "Recomendações geradas"]}
              rows={data.canaisMaisRecomendados.map((canal) => [
                canal.canal,
                canal.total.toLocaleString("pt-BR"),
              ])}
              emptyMessage="Nenhuma recomendação gerada ainda"
            />
          </section>

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Fatores mais frequentes na classificação
            </h2>
            <ReportTable
              headers={["Fator", "Ocorrências"]}
              rows={data.fatoresMaisFrequentes.map((fator) => [
                fator.nome,
                fator.total.toLocaleString("pt-BR"),
              ])}
              emptyMessage="Nenhum fator registrado ainda"
            />
          </section>

          <section>
            <h2
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cobertura de evidências por fonte externa
            </h2>
            <ReportTable
              headers={["Fonte", "% de dossiês respondidos"]}
              rows={data.metricasPorFonte.map((metrica) => [
                metrica.fonte,
                formatAlreadyPercent(metrica.percentualRespondida),
              ])}
              emptyMessage="Nenhuma fonte consultada ainda"
            />
          </section>

          <footer
            className="border-t pt-4 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
          >
            <p>
              Este relatório é gerado automaticamente a partir dos dados consolidados na plataforma{" "}
              {brand.productName} e reflete o estado da base no momento de sua geração. Distribuição
              restrita — uso interno.
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border p-3"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
          {headers.map((header) => (
            <th
              key={header}
              className="py-2 text-left text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b" style={{ borderColor: "var(--color-border)" }}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
