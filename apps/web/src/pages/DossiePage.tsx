import { useParams } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type {
  ConfidenceHeatmap,
  DossieVersionEntry,
  DossieVersionSnapshotDetail,
} from "../types/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge, RiskBadge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const STATUS_LABEL: Record<string, string> = {
  ENCONTRADO: "Encontrado",
  NAO_ENCONTRADO: "Não encontrado",
  NAO_CONSULTADO: "Não consultado",
  ERRO_CONSULTA: "Erro na consulta",
};

/** Mapeia cada fator do Explainable Rule Engine (ver ADR 0016) para uma das quatro dimensões de risco exibidas na "Análise da IA" — puramente de apresentação, não inventa nenhum número novo. */
const DIMENSAO_POR_FATOR: Record<string, string> = {
  "Pendência Fiscal (PGFN)": "Risco financeiro",
  "Processo Judicial (DataJud)": "Risco jurídico",
  "Situação Cadastral (Receita Federal)": "Risco operacional",
};

function nivelConfianca(confidenceScore: number): string {
  if (confidenceScore >= 0.8) return "Alta";
  if (confidenceScore >= 0.5) return "Média";
  return "Baixa";
}

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

  const latestVersao =
    history.data && history.data.items.length > 0
      ? history.data.items[history.data.items.length - 1]!.versao
      : null;

  const analise = useApi(
    () =>
      latestVersao
        ? apiClient.get<DossieVersionSnapshotDetail>(
            `/dossiers/${dossieId}/history/${latestVersao}`,
          )
        : Promise.resolve(null),
    [dossieId, latestVersao],
  );

  const pontosPositivos = analise.data?.fatores.filter((f) => f.direcao === "REDUZ_RISCO") ?? [];
  const pontosAtencao = analise.data?.fatores.filter((f) => f.direcao === "AUMENTA_RISCO") ?? [];

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
          title="Análise da IA"
          subtitle="Motor de classificação explicável (IA de demonstração) — nenhuma consulta externa real"
        />
        <CardBody>
          {analise.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : analise.error ? (
            <ErrorState message={analise.error} onRetry={analise.reload} code={analise.errorCode} />
          ) : !analise.data ? (
            <EmptyState title="Ainda sem análise gerada para este dossiê" />
          ) : (
            <div className="space-y-5">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Resumo executivo
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>
                  {analise.data.justificativaGeral}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-success)" }}
                  >
                    ✅ Pontos positivos
                  </p>
                  {pontosPositivos.length === 0 ? (
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Nenhum fator redutor de risco identificado
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm" style={{ color: "var(--color-text)" }}>
                      {pontosPositivos.map((fator) => (
                        <li key={fator.nome}>• {fator.justificativa}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-danger)" }}
                  >
                    ⚠️ Pontos de atenção
                  </p>
                  {pontosAtencao.length === 0 ? (
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Nenhum fator de risco identificado
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm" style={{ color: "var(--color-text)" }}>
                      {pontosAtencao.map((fator) => (
                        <li key={fator.nome}>• {fator.justificativa}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Dimensões de risco avaliadas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analise.data.fatores.map((fator) => (
                    <Badge
                      key={fator.nome}
                      tone={fator.direcao === "AUMENTA_RISCO" ? "danger" : "success"}
                    >
                      {DIMENSAO_POR_FATOR[fator.nome] ?? fator.nome} · {fator.fonte}
                    </Badge>
                  ))}
                  {analise.data.fatores.length === 0 ? (
                    <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Nenhuma dimensão avaliada ainda
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Recomendação
                  </p>
                  {analise.data.recomendacoes.length === 0 ? (
                    <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Nenhuma recomendação gerada
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm" style={{ color: "var(--color-text)" }}>
                      {analise.data.recomendacoes.map((recomendacao, index) => (
                        <li key={index}>
                          <strong>{recomendacao.canal.replaceAll("_", " ")}</strong> —{" "}
                          {recomendacao.justificativa}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Nível de confiança
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>
                    {nivelConfianca(analise.data.confidenceScore)} (
                    {(analise.data.confidenceScore * 100).toFixed(0)}%)
                  </p>
                </div>
              </div>
            </div>
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
