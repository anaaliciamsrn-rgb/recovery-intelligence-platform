import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type {
  CaseStatus,
  ImportBatchSummary,
  Page,
  CaseSummary,
  ScheduledJobSummary,
} from "../types/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { KpiCard } from "../components/ui/KpiCard";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const CASE_STATUS_COLUMNS: { status: CaseStatus; label: string }[] = [
  { status: "ABERTO", label: "Aberto" },
  { status: "EM_ANDAMENTO", label: "Em andamento" },
  { status: "NEGOCIACAO", label: "Negociação" },
  { status: "AGUARDANDO_RETORNO", label: "Aguardando retorno" },
  { status: "RESOLVIDO", label: "Resolvido" },
];

const IMPORT_STATUS_TONE = { CONCLUIDO: "success", REVERTIDO: "danger" } as const;
const JOB_STATUS_TONE = {
  PENDENTE: "info",
  EXECUTANDO: "warning",
  CONCLUIDO: "success",
  MORTO: "danger",
} as const;

export function OperationalDashboardPage() {
  const cases = useApi(
    () => apiClient.get<Page<CaseSummary>>("/cases", { page: 1, pageSize: 100 }),
    [],
  );
  const imports = useApi(
    () => apiClient.get<Page<ImportBatchSummary>>("/imports", { page: 1, pageSize: 5 }),
    [],
  );
  const jobs = useApi(
    () => apiClient.get<Page<ScheduledJobSummary>>("/scheduler/jobs", { page: 1, pageSize: 5 }),
    [],
  );

  const casesByStatus = (status: CaseStatus) =>
    cases.data?.items.filter((item) => item.status === status) ?? [];
  const totalCasesAbertos =
    cases.data?.items.filter((item) => item.status !== "RESOLVIDO" && item.status !== "CANCELADO")
      .length ?? 0;
  const jobsMortos = jobs.data?.items.filter((job) => job.status === "MORTO").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Casos em aberto" value={String(totalCasesAbertos)} icon="📋" />
        <KpiCard
          label="Importações recentes"
          value={String(imports.data?.total ?? 0)}
          icon="📥"
          accent="primary"
        />
        <KpiCard
          label="Jobs em fila-morta"
          value={String(jobsMortos)}
          icon="⚠️"
          accent={jobsMortos > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <CardHeader title="Casos por status" subtitle="Visão de funil do ciclo de cobrança" />
        <CardBody>
          {cases.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : cases.error ? (
            <ErrorState message={cases.error} onRetry={cases.reload} code={cases.errorCode} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CASE_STATUS_COLUMNS.map((column) => {
                const items = casesByStatus(column.status);
                return (
                  <div
                    key={column.status}
                    className="rounded-[var(--radius-md)] border p-3"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-bg-muted)",
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        {column.label}
                      </span>
                      <Badge>{items.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {items.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          to={`/app/dossies/${item.dossieId}`}
                          className="block truncate rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs hover:opacity-80"
                          style={{
                            backgroundColor: "var(--color-bg-elevated)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        >
                          #{item.id.slice(0, 8)} · {item.priority}
                        </Link>
                      ))}
                      {items.length === 0 ? (
                        <p
                          className="py-2 text-center text-xs"
                          style={{ color: "var(--color-text-subtle)" }}
                        >
                          Vazio
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Últimas importações" subtitle="Histórico de lotes de planilhas" />
          <CardBody>
            {imports.isLoading ? (
              <LoadingSkeleton rows={3} />
            ) : imports.error ? (
              <ErrorState
                message={imports.error}
                onRetry={imports.reload}
                code={imports.errorCode}
              />
            ) : imports.data?.items.length === 0 ? (
              <EmptyState
                title="Nenhuma importação ainda"
                description="Lotes importados via /imports aparecerão aqui."
              />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {imports.data?.items.map((batch) => (
                  <li key={batch.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p style={{ color: "var(--color-text)" }}>{batch.nomeArquivo}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {batch.totalLinhas} linhas · {batch.contagens.importadas} importadas
                      </p>
                    </div>
                    <Badge tone={IMPORT_STATUS_TONE[batch.status]}>{batch.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Jobs agendados" subtitle="Últimos jobs do scheduler" />
          <CardBody>
            {jobs.isLoading ? (
              <LoadingSkeleton rows={3} />
            ) : jobs.error ? (
              <ErrorState message={jobs.error} onRetry={jobs.reload} code={jobs.errorCode} />
            ) : jobs.data?.items.length === 0 ? (
              <EmptyState
                title="Nenhum job agendado"
                description="Jobs criados via /scheduler/jobs aparecerão aqui."
              />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {jobs.data?.items.map((job) => (
                  <li key={job.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p style={{ color: "var(--color-text)" }}>{job.nome}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {job.tipo} · tentativa {job.tentativas}/{job.maxTentativas}
                      </p>
                    </div>
                    <Badge tone={JOB_STATUS_TONE[job.status]}>{job.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
