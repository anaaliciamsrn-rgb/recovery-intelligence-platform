import { useState, type FormEvent } from "react";
import { apiClient, ApiError } from "../lib/api-client";
import type { EmpresaSummary, ParticipacaoSocietariaSummary, PessoaSummary } from "../types/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

type EntityKind = "PESSOA" | "EMPRESA";

interface CenterEntity {
  kind: EntityKind;
  id: string;
  label: string;
  document: string;
}

interface GraphNode {
  id: string;
  kind: EntityKind;
  label: string;
  papel: string;
  percentualParticipacao: number | null;
  ativo: boolean;
}

const SVG_SIZE = 520;
const CENTER = SVG_SIZE / 2;
const ORBIT_RADIUS = 190;
const NODE_RADIUS = 32;
const CENTER_NODE_RADIUS = 42;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function truncateLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function resolveCounterpartLabel(kind: EntityKind, id: string): Promise<string> {
  if (kind === "PESSOA") {
    const pessoa = await apiClient.get<PessoaSummary>(`/pessoas/id/${id}`);
    return pessoa.nome;
  }
  const empresa = await apiClient.get<EmpresaSummary>(`/empresas/id/${id}`);
  return empresa.razaoSocial;
}

/**
 * Layout radial determinístico (trigonometria simples) em vez de uma
 * simulação de física (ex.: d3-force): o fan-out real desta consulta é
 * sempre pequeno (participações societárias diretas de uma única Pessoa ou
 * Empresa), então um layout físico só adicionaria jitter sem necessidade.
 */
export function RelationshipGraphPage() {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<CenterEntity | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  async function handleSearch(event: FormEvent): Promise<void> {
    event.preventDefault();
    const digits = onlyDigits(query);
    if (digits.length !== 11 && digits.length !== 14) {
      setError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelected(null);

    try {
      const kind: EntityKind = digits.length === 11 ? "PESSOA" : "EMPRESA";
      const centerEntity =
        kind === "PESSOA"
          ? await apiClient.get<PessoaSummary>(`/pessoas/${digits}`)
          : await apiClient.get<EmpresaSummary>(`/empresas/${digits}`);
      const label =
        kind === "PESSOA"
          ? (centerEntity as PessoaSummary).nome
          : (centerEntity as EmpresaSummary).razaoSocial;
      setCenter({ kind, id: centerEntity.id, label, document: digits });

      const { participacoes } = await apiClient.get<{
        participacoes: ParticipacaoSocietariaSummary[];
      }>(
        "/participacoes-societarias",
        kind === "PESSOA" ? { pessoaId: centerEntity.id } : { empresaId: centerEntity.id },
      );

      const counterpartKind: EntityKind = kind === "PESSOA" ? "EMPRESA" : "PESSOA";
      const resolvedNodes = await Promise.all(
        participacoes.map(async (participacao): Promise<GraphNode> => {
          const counterpartId = kind === "PESSOA" ? participacao.empresaId : participacao.pessoaId;
          const counterpartLabel = await resolveCounterpartLabel(counterpartKind, counterpartId);
          return {
            id: counterpartId,
            kind: counterpartKind,
            label: counterpartLabel,
            papel: participacao.papel,
            percentualParticipacao: participacao.percentualParticipacao,
            ativo: participacao.dataSaida === null,
          };
        }),
      );

      setNodes(resolvedNodes);
    } catch (err) {
      setCenter(null);
      setNodes([]);
      setError(err instanceof ApiError ? err.message : "Não foi possível resolver esta entidade");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Buscar entidade"
          subtitle="Digite um CPF ou CNPJ para visualizar a rede de participações societárias"
        />
        <CardBody>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="CPF ou CNPJ"
              className="flex-1 rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Buscando…" : "Buscar"}
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
            <ErrorState message={error} />
          </CardBody>
        </Card>
      ) : center ? (
        <Card>
          <CardHeader
            title={`Rede societária de ${center.label}`}
            subtitle={`${center.kind === "PESSOA" ? "CPF" : "CNPJ"}: ${center.document} · ${nodes.length} vínculo(s)`}
          />
          <CardBody>
            {nodes.length === 0 ? (
              <EmptyState
                title="Nenhum vínculo societário encontrado"
                description="Esta entidade não possui participações registradas"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <RelationshipGraphSvg
                  center={center}
                  nodes={nodes}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
                <NodeDetailsPanel node={selected} />
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <EmptyState
              title="Faça uma busca para começar"
              description="A rede de participações societárias aparecerá aqui"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function RelationshipGraphSvg({
  center,
  nodes,
  selectedId,
  onSelect,
}: {
  center: CenterEntity;
  nodes: GraphNode[];
  selectedId: string | null;
  onSelect: (node: GraphNode) => void;
}) {
  const positions = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    return {
      node,
      x: CENTER + ORBIT_RADIUS * Math.cos(angle),
      y: CENTER + ORBIT_RADIUS * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="w-full"
      style={{ maxHeight: 520 }}
      role="img"
      aria-label="Grafo de relacionamento societário"
    >
      {positions.map(({ node, x, y }) => (
        <line
          key={`edge-${node.id}`}
          x1={CENTER}
          y1={CENTER}
          x2={x}
          y2={y}
          stroke={node.ativo ? "var(--color-primary)" : "var(--color-border)"}
          strokeWidth={node.ativo ? 2 : 1}
          strokeDasharray={node.ativo ? undefined : "4 4"}
        />
      ))}

      {positions.map(({ node, x, y }) => (
        <g key={node.id} onClick={() => onSelect(node)} style={{ cursor: "pointer" }}>
          <circle
            cx={x}
            cy={y}
            r={NODE_RADIUS}
            fill={selectedId === node.id ? "var(--color-primary)" : "var(--color-bg-elevated)"}
            stroke="var(--color-border)"
            strokeWidth={selectedId === node.id ? 0 : 1.5}
          />
          <text x={x} y={y - 2} textAnchor="middle" fontSize={13}>
            {node.kind === "PESSOA" ? "👤" : "🏢"}
          </text>
          <text
            x={x}
            y={y + 14}
            textAnchor="middle"
            fontSize={9}
            fill={selectedId === node.id ? "#ffffff" : "var(--color-text-muted)"}
          >
            {truncateLabel(node.label, 14)}
          </text>
        </g>
      ))}

      <circle cx={CENTER} cy={CENTER} r={CENTER_NODE_RADIUS} fill="var(--color-accent)" />
      <text x={CENTER} y={CENTER - 4} textAnchor="middle" fontSize={15}>
        {center.kind === "PESSOA" ? "👤" : "🏢"}
      </text>
      <text
        x={CENTER}
        y={CENTER + 15}
        textAnchor="middle"
        fontSize={10}
        fill="#ffffff"
        fontWeight={600}
      >
        {truncateLabel(center.label, 16)}
      </text>
    </svg>
  );
}

function NodeDetailsPanel({ node }: { node: GraphNode | null }) {
  if (!node) {
    return (
      <div
        className="flex items-center rounded-[var(--radius-md)] border p-4 text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        Selecione um nó no grafo para ver os detalhes do vínculo.
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-[var(--radius-md)] border p-4"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          {node.kind === "PESSOA" ? "Pessoa" : "Empresa"}
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {node.label}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={node.ativo ? "success" : "neutral"}>
          {node.ativo ? "Vínculo ativo" : "Vínculo encerrado"}
        </Badge>
        <Badge tone="primary">{node.papel.replaceAll("_", " ")}</Badge>
      </div>
      {node.percentualParticipacao !== null ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Participação:{" "}
          <strong style={{ color: "var(--color-text)" }}>
            {node.percentualParticipacao.toFixed(1)}%
          </strong>
        </p>
      ) : null}
    </div>
  );
}
