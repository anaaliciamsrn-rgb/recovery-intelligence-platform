import { useParams } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type { ConfidenceHeatmap, DossieVersionEntry } from "../types/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge, RiskBadge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const STATUS_LABEL: Record<string, string> = {
  ENCONTRADO: "Encontrado",
  NAO_ENCONTRADO: "Não encontrado",
  NAO_CONSULTADO: "Não consultado",
  ERRO_CONSULTA: "Erro na consulta",
};

/** Intensidade de cor proporcional à contribuição da fonte na confiança agregada — o próprio "heatmap". */
function heatColor(contribuicaoPercentual: number, status: string): string {
  if (status !== "ENCONTRADO") return "var(--color-bg-muted)";
  const intensity = Math.min(1, contribuicaoPercentual / 100);
  return `color-mix(in srgb, var(--color-primary) ${Math.round(intensity * 70 + 10)}%, var(--color-bg-elevated))`;
}

export function DossiePage() {
  const { dossieId = "" } = useParams<{ dossieId: string }>();

  const heatmap = useApi(
    () => apiClient.get<ConfidenceHeatmap>(`/confidence-heatmap/${dossieId}`),
    [dossieId],
  );
  const history = useApi(
    () => apiClient.get<{ items: DossieVersionEntry[] }>(`/dossiers/${dossieId}/history`),
    [dossieId],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Heatmap de confiança"
          subtitle={`Dossiê #${dossieId.slice(0, 8)}`}
          action={
            heatmap.data ? <RiskBadge classificacao={heatmap.data.classificacao} /> : undefined
          }
        />
        <CardBody>
          {heatmap.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : heatmap.error ? (
            <ErrorState message={heatmap.error} onRetry={heatmap.reload} code={heatmap.errorCode} />
          ) : !heatmap.data ? null : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>
                  Confiança agregada:{" "}
                  <strong style={{ color: "var(--color-text)" }}>
                    {(heatmap.data.confiancaAgregada * 100).toFixed(0)}%
                  </strong>
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  Score de risco:{" "}
                  <strong style={{ color: "var(--color-text)" }}>
                    {heatmap.data.riskScore.toFixed(1)}
                  </strong>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {heatmap.data.fontes.map((fonte) => (
                  <div
                    key={fonte.fonte}
                    className="rounded-[var(--radius-md)] border p-4"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: heatColor(fonte.contribuicaoPercentual, fonte.status),
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      {fonte.fonte}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {STATUS_LABEL[fonte.status] ?? fonte.status}
                    </p>
                    {fonte.status === "ENCONTRADO" ? (
                      <p
                        className="mt-2 text-lg font-semibold tabular-nums"
                        style={{ color: "var(--color-text)" }}
                      >
                        {fonte.contribuicaoPercentual.toFixed(0)}%
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {heatmap.data.fontesAusentes.length > 0 ? (
                <p className="mt-4 text-xs" style={{ color: "var(--color-warning)" }}>
                  ⚠️ Fontes ainda não consultadas: {heatmap.data.fontesAusentes.join(", ")}
                </p>
              ) : null}
              {heatmap.data.fontesConflitantes.length > 0 ? (
                <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                  ⚠️ Fontes com sinais conflitantes: {heatmap.data.fontesConflitantes.join(", ")}
                </p>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Timeline de versões"
          subtitle="Cada evidência nova gera uma versão auditável do dossiê"
        />
        <CardBody>
          {history.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : history.error ? (
            <ErrorState message={history.error} onRetry={history.reload} code={history.errorCode} />
          ) : history.data?.items.length === 0 ? (
            <EmptyState title="Nenhuma versão registrada ainda" />
          ) : (
            <ol className="relative border-l pl-5" style={{ borderColor: "var(--color-border)" }}>
              {history.data?.items.map((entry) => (
                <li key={entry.versao} className="mb-5 last:mb-0">
                  <span
                    className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <div className="flex items-center gap-2">
                    <Badge tone="primary">v{entry.versao}</Badge>
                    <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                      {new Date(entry.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <ul
                    className="mt-1.5 list-disc pl-4 text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {entry.resumoMudancas.length > 0 ? (
                      entry.resumoMudancas.map((mudanca, index) => <li key={index}>{mudanca}</li>)
                    ) : (
                      <li>Sem alterações resumidas</li>
                    )}
                  </ul>
                  <p
                    className="mt-1 font-mono text-xs"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    hash: {entry.hash.slice(0, 12)}…
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
