import { useCallback, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { useApi } from "../hooks/useApi";
import type { ImportBatchSummary, ImportEmpresasResult, Page } from "../types/api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const STATUS_TONE = { CONCLUIDO: "success", REVERTIDO: "neutral" } as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Fluxo principal do produto (ver ADR 0037): importar → IA de demonstração
 * processa cada linha → dossiês criados → dashboard atualizado. `key`
 * incrementado força o `<input type="file">` a resetar entre uploads (o
 * DOM nunca limpa `value` por conta própria quando o mesmo arquivo é
 * reselecionado).
 */
export function ImportacoesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<ImportEmpresasResult | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<Page<ImportBatchSummary>>("/imports", { page: 1, pageSize: 50 }),
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUltimoResultado(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const resultado = await apiClient.post<ImportEmpresasResult>(
          "/imports/empresas",
          formData,
          { isFormData: true },
        );
        setUltimoResultado(resultado);
        toast.show(
          `Importação concluída: ${resultado.empresasProcessadas} empresas processadas, ${resultado.dossiesCriados} dossiês criados.`,
          "success",
        );
        reload();
      } catch (err) {
        toast.show(
          err instanceof ApiError ? err.message : "Erro inesperado ao importar a planilha",
          "error",
        );
      } finally {
        setIsUploading(false);
        setInputKey((key) => key + 1);
      }
    },
    [reload, toast],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingOver(false);
      const file = event.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Importar empresas"
          subtitle="Envie sua carteira de clientes para gerar dossiês, classificação e recomendações automaticamente"
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void apiClient.downloadFile("/imports/empresas/modelo", "modelo_empresas.xlsx")
                }
              >
                📄 Baixar modelo
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void apiClient.downloadFile("/imports/empresas/demo", "demo_empresas.xlsx")
                }
              >
                ✨ Baixar planilha demo
              </Button>
            </div>
          }
        />
        <CardBody>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed px-6 py-12 text-center transition-colors"
            style={{
              borderColor: isDraggingOver ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: isDraggingOver
                ? "color-mix(in srgb, var(--color-primary) 6%, transparent)"
                : "transparent",
            }}
          >
            <span className="text-3xl" aria-hidden>
              {isUploading ? "⏳" : "📥"}
            </span>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              {isUploading
                ? "Processando planilha — a IA de demonstração está gerando os dossiês..."
                : "Arraste sua planilha aqui, ou clique para selecionar"}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Formatos aceitos: .xlsx, .csv — colunas CNPJ, Razão Social, Nome Fantasia, Telefone,
              Email, Cidade, UF, Responsável
            </p>
            {!isUploading ? <Button size="sm">Selecionar arquivo</Button> : null}
            <input
              key={inputKey}
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          {ultimoResultado ? (
            <div
              className="mt-4 rounded-[var(--radius-md)] border px-4 py-3 text-sm"
              style={{
                borderColor: "var(--color-success)",
                backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)",
                color: "var(--color-text)",
              }}
            >
              <p className="font-medium">✔ Importação concluída</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {ultimoResultado.empresasProcessadas} empresas processadas ·{" "}
                {ultimoResultado.dossiesCriados} dossiês criados · Dashboard atualizado
                automaticamente
              </p>
            </div>
          ) : null}

          <p className="mt-4 text-xs italic" style={{ color: "var(--color-text-subtle)" }}>
            As evidências de PGFN, DataJud, Receita Federal, Portal da Transparência e CENPROT são
            geradas por uma IA de demonstração — nenhuma consulta a fonte externa real acontece
            nesta fase.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Histórico de importações" />
        <CardBody className="pt-1">
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} code={errorCode} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon="📥"
              title="Nenhuma importação ainda"
              description="Baixe o modelo ou a planilha demo acima e importe sua primeira carteira de clientes."
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className="border-b text-xs uppercase"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
                >
                  <th className="py-2 font-medium">Nome</th>
                  <th className="py-2 font-medium">Registros</th>
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Importado por</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {data.items.map((batch) => (
                  <tr key={batch.id}>
                    <td className="py-2.5 font-medium" style={{ color: "var(--color-text)" }}>
                      {batch.nomeArquivo}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--color-text-muted)" }}>
                      {batch.contagens.importadas} de {batch.totalLinhas}
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                      {formatDate(batch.iniciadoEm)}
                    </td>
                    <td className="py-2.5">
                      <Badge tone={STATUS_TONE[batch.status]}>
                        {batch.status === "CONCLUIDO" ? "Processado" : "Revertido"}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {batch.iniciadoPorUsuarioId === user?.id ? "Você" : "Outro usuário"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
