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
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type { AnalyticsSummary } from "../types/api";
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

export function ExecutiveDashboardPage() {
  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<AnalyticsSummary>("/analytics/summary"),
    [],
  );

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !data)
    return <ErrorState message={error ?? "Sem dados"} onRetry={reload} code={errorCode} />;

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
          label="Pessoas cadastradas"
          value={data.totalPessoas.toLocaleString("pt-BR")}
          icon="👤"
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
                  <Tooltip />
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
                  <Tooltip />
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
                  <Tooltip />
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
                      {formatPercent(metrica.percentualRespondida)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--color-bg-muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: formatPercent(metrica.percentualRespondida),
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
    </div>
  );
}
