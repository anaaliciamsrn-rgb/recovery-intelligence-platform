import { Link } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type { CaseSummary, Page } from "../types/api";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const PRIORITY_TONE = {
  BAIXA: "neutral",
  MEDIA: "info",
  ALTA: "warning",
  URGENTE: "danger",
} as const;
const STATUS_TONE = {
  ABERTO: "info",
  EM_ANDAMENTO: "primary",
  AGUARDANDO_RETORNO: "warning",
  NEGOCIACAO: "warning",
  RESOLVIDO: "success",
  CANCELADO: "neutral",
} as const;

export function CaseListPage() {
  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<Page<CaseSummary>>("/cases", { page: 1, pageSize: 100 }),
    [],
  );

  return (
    <Card>
      <CardBody className="pt-5">
        {isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} code={errorCode} />
        ) : data?.items.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nenhum caso ainda"
            description="Casos criados via POST /cases aparecerão aqui."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-xs uppercase"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
              >
                <th className="py-2 font-medium">Caso</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Prioridade</th>
                <th className="py-2 font-medium">Tags</th>
                <th className="py-2 font-medium">Próxima ação</th>
                <th className="py-2 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5">
                    <Link
                      to={`/app/dossies/${item.dossieId}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--color-primary)" }}
                    >
                      #{item.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={STATUS_TONE[item.status]}>
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
                  </td>
                  <td className="py-2.5" style={{ color: "var(--color-text-muted)" }}>
                    {item.tags.length > 0 ? item.tags.join(", ") : "—"}
                  </td>
                  <td className="py-2.5" style={{ color: "var(--color-text-muted)" }}>
                    {item.proximaAcao ?? "—"}
                  </td>
                  <td className="py-2.5 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
