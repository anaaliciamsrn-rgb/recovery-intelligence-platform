import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../lib/api-client";
import type { IdentityMatch } from "../types/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge, RiskBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const DECISION_LABEL: Record<IdentityMatch["decision"], string> = {
  MATCH: "Correspondência confirmada",
  POSSIBLE_MATCH: "Possível correspondência",
  NO_MATCH: "Sem correspondência",
};

const DECISION_TONE: Record<IdentityMatch["decision"], "success" | "warning" | "neutral"> = {
  MATCH: "success",
  POSSIBLE_MATCH: "warning",
  NO_MATCH: "neutral",
};

/**
 * Busca de identidade (ver ADR 0037) — usa o motor real de Identity
 * Resolution já existente na plataforma (`POST /identity-resolution/resolve`,
 * ADR 0013), nunca uma simulação separada: o mesmo `IdentityMatchScorer`
 * ponderado que decide "match"/"possível match"/"sem match" em qualquer
 * outro fluxo da plataforma. Documento pode vir incompleto ou com erro de
 * digitação — a confiança reflete isso, nunca aparenta certeza que não existe.
 */
export function ConsultaPage() {
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [matches, setMatches] = useState<IdentityMatch[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSearch(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (documento.trim().length === 0 && nome.trim().length === 0) {
      setError("Informe um CPF/CNPJ e/ou um nome para buscar");
      setErrorCode(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const result = await apiClient.post<{ matches: IdentityMatch[] }>(
        "/identity-resolution/resolve",
        { documento: documento.trim() || nome.trim(), nome: nome.trim() || null },
      );
      setMatches(result.matches);
    } catch (err) {
      setMatches(null);
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir a busca");
      setErrorCode(err instanceof ApiError ? err.code : null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Consultar CPF/CNPJ"
          subtitle="Digite um documento (mesmo incompleto) e/ou um nome — a plataforma calcula a confiança de ser a mesma pessoa/empresa, nunca apresenta um palpite como fato"
        />
        <CardBody>
          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={documento}
              onChange={(event) => setDocumento(event.target.value)}
              placeholder="CPF ou CNPJ"
              className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            />
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Nome ou razão social (opcional)"
              className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Buscando…" : "🔍 Buscar"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card>
          <CardBody>
            <LoadingSkeleton rows={5} />
          </CardBody>
        </Card>
      ) : error ? (
        <Card>
          <CardBody>
            <ErrorState message={error} code={errorCode} />
          </CardBody>
        </Card>
      ) : matches === null ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="🔍"
              title="Faça uma busca para começar"
              description="Os resultados e a confiança de correspondência aparecerão aqui"
            />
          </CardBody>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="🔍"
              title="Nenhum registro encontrado"
              description="Nenhuma Pessoa ou Empresa cadastrada corresponde a esta busca"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchCard key={match.candidateId} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: IdentityMatch }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              {match.candidateNome}
            </p>
            <p className="font-mono text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {match.candidateDocumento}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge tone={DECISION_TONE[match.decision]}>{DECISION_LABEL[match.decision]}</Badge>
            <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              Confiança: {(match.confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sinais avaliados
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-xs uppercase"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
              >
                <th className="py-1.5 font-medium">Sinal</th>
                <th className="py-1.5 font-medium">Peso</th>
                <th className="py-1.5 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {match.signals.map((signal) => (
                <tr key={signal.tipo}>
                  <td className="py-1.5" style={{ color: "var(--color-text)" }}>
                    {signal.descricao}
                  </td>
                  <td className="py-1.5 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {signal.peso.toFixed(2)}
                  </td>
                  <td className="py-1.5">
                    <Badge tone={signal.favoravel ? "success" : "neutral"}>
                      {signal.favoravel ? "favorável" : "desfavorável"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-center justify-between rounded-[var(--radius-sm)] border p-3 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          {match.dossie ? (
            <>
              <span style={{ color: "var(--color-text-muted)" }}>
                Dossiê já analisado nesta carteira
                {match.dossie.classificacao ? (
                  <>
                    {" "}
                    · <RiskBadge classificacao={match.dossie.classificacao} />
                  </>
                ) : null}
              </span>
              <Link to={`/app/dossies/${match.dossie.dossieId}`}>
                <Button>Ver dossiê</Button>
              </Link>
            </>
          ) : (
            <span style={{ color: "var(--color-text-muted)" }}>
              Nenhum dossiê analisado ainda para esta entidade na sua carteira
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
