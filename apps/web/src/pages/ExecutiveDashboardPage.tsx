import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type { AnalyticsSummary } from "../types/api";
import { RiskBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { LoadingSkeleton, ErrorState } from "../components/ui/States";

const RISK_COLOR: Record<string, string> = {
  BAIXO_RISCO: "#16a34a",
  MEDIO_RISCO: "#d97706",
  ALTO_RISCO: "#dc2626",
};

const RISK_LABEL: Record<string, string> = {
  BAIXO_RISCO: "Baixo risco",
  MEDIO_RISCO: "Médio risco",
  ALTO_RISCO: "Alto risco",
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/** `metricasPorFonte[].percentualRespondida` já vem em escala 0-100 do backend (`AnalyticsSummaryBuilder`) — diferente de `confiancaMedia`/`scoreMedio` (fração 0-1). Multiplicar de novo por 100 aqui produzia "10000%". */
function formatAlreadyPercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

/** Tooltip do Recharts não herda as variáveis de tema por padrão — sem isso, o texto fica ilegível (claro sobre claro/escuro sobre escuro dependendo do tema ativo). */
const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text)",
  fontSize: "12px",
};
const TOOLTIP_LABEL_STYLE: CSSProperties = { color: "var(--color-text)" };
const TOOLTIP_ITEM_STYLE: CSSProperties = { color: "var(--color-text)" };

export function ExecutiveDashboardPage() {
  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<AnalyticsSummary>("/analytics/summary"),
    [],
  );

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !data)
    return <ErrorState message={error ?? "Sem dados"} onRetry={reload} code={errorCode} />;

  if (data.totalDossiesAnalisados === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            📊
          </span>
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              Você ainda não possui empresas cadastradas
            </p>
            <p
              className="mx-auto mt-2 max-w-md text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Importe sua carteira de clientes para gerar dossiês, classificação de risco e
              recomendações automaticamente. Nenhum dado é exibido aqui até sua primeira importação.
            </p>
          </div>
          <Link to="/app/importacoes">
            <Button>📥 Importar planilha</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const distribuicaoRisco = Object.entries(data.distribuicaoRisco).map(
    ([classificacao, total]) => ({
      classificacao,
      total,
      label: RISK_LABEL[classificacao] ?? classificacao,
      color: RISK_COLOR[classificacao] ?? "#94a3b8",
    }),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Entidades analisadas"
          value={(data.totalPessoas + data.totalEmpresas).toLocaleString("pt-BR")}
          icon="🏢"
        />
        <KpiCard
          label="Dossiês analisados"
          value={data.totalDossiesAnalisados.toLocaleString("pt-BR")}
          icon="📁"
          accent="primary"
        />
        <KpiCard
          label="Score médio"
          value={data.scoreMedio.toFixed(1)}
          icon="📈"
          accent={data.scoreMedio >= 70 ? "danger" : data.scoreMedio >= 40 ? "warning" : "success"}
        />
        <KpiCard
          label="Confiança média"
          value={formatPercent(data.confiancaMedia)}
          icon="✅"
          accent="success"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Distribuição de risco" subtitle="Carteira analisada até agora" />
          <CardBody>
            {distribuicaoRisco.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Sem dossiês classificados ainda
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={distribuicaoRisco}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {distribuicaoRisco.map((entry) => (
                      <Cell key={entry.classificacao} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {distribuicaoRisco.map((entry) => (
                <span
                  key={entry.classificacao}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.label} ({entry.total})
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Evolução temporal"
            subtitle="Score médio e confiança média por período"
          />
          <CardBody>
            {data.evolucaoTemporal.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Ainda não há histórico de versões suficiente
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.evolucaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-text-subtle)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-subtle)" />
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="scoreMedio"
                    name="Score médio"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="confiancaMedia"
                    name="Confiança média"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Canais mais recomendados" />
          <CardBody>
            {data.canaisMaisRecomendados.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nenhuma recomendação gerada ainda
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={data.canaisMaisRecomendados}
                  layout="vertical"
                  margin={{ left: 24 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-text-subtle)" />
                  <YAxis
                    type="category"
                    dataKey="canal"
                    tick={{ fontSize: 11 }}
                    width={110}
                    stroke="var(--color-text-subtle)"
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                  />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cobertura por fonte"
            subtitle="% de dossiês com resposta de cada fonte externa"
          />
          <CardBody className="space-y-3">
            {data.metricasPorFonte.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nenhuma fonte consultada ainda
              </p>
            ) : (
              data.metricasPorFonte.map((metrica) => (
                <div key={metrica.fonte}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span style={{ color: "var(--color-text)" }}>{metrica.fonte}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {formatAlreadyPercent(metrica.percentualRespondida)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--color-bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: formatAlreadyPercent(metrica.percentualRespondida),
                        backgroundColor: "var(--color-accent)",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Empresas em maior risco"
            subtitle="Top 5 por score de risco na carteira atual"
          />
          <CardBody className="space-y-2">
            {data.empresasEmMaiorRisco.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nenhuma empresa classificada ainda
              </p>
            ) : (
              data.empresasEmMaiorRisco.map((empresa) => (
                <Link
                  key={empresa.dossieId}
                  to={`/app/dossies/${empresa.dossieId}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border p-2.5 text-sm transition-colors hover:bg-[var(--color-bg-muted)]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span style={{ color: "var(--color-text)" }}>{empresa.nome}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {empresa.riskScore.toFixed(2)}
                    </span>
                    <RiskBadge classificacao={empresa.classificacao} />
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Alertas" subtitle="Derivados dos dados importados, nunca fixos" />
          <CardBody className="space-y-2">
            {data.alertas.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nenhum alerta no momento
              </p>
            ) : (
              data.alertas.map((alerta, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-[var(--radius-sm)] border p-2.5 text-sm"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  <span aria-hidden>⚠️</span>
                  <span>{alerta}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
