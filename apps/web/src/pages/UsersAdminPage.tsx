import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/ui/States";

const ALL_ROLES = ["ADMIN", "MANAGER", "ANALYST", "COLLECTOR", "AUDITOR", "VIEWER"] as const;

interface UserSummary {
  id: string;
  email: string;
  nome: string | null;
  sobrenome: string | null;
  empresa: string | null;
  roles: string[];
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * "Aprovar conta" na prática: quem se autocadastra entra sempre como
 * `VIEWER`, sem nenhuma permissão (ver RegisterUseCase) — esta tela é onde um
 * administrador atribui o papel real. Só visível/acessível a quem tem
 * `identity:manage-users` (ver Sidebar.tsx e o backend em auth.routes.ts).
 */
export function UsersAdminPage() {
  const { data, error, errorCode, isLoading, reload } = useApi(
    () => apiClient.get<{ items: UserSummary[] }>("/auth/users"),
    [],
  );
  const { show } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, string[]>>({});

  function rolesFor(user: UserSummary): string[] {
    return pendingRoles[user.id] ?? user.roles;
  }

  function toggleRole(user: UserSummary, role: string): void {
    const current = rolesFor(user);
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setPendingRoles((state) => ({ ...state, [user.id]: next }));
  }

  async function handleSave(user: UserSummary): Promise<void> {
    const roles = rolesFor(user);
    if (roles.length === 0) {
      show("Selecione ao menos um papel.", "error");
      return;
    }

    setSavingId(user.id);
    try {
      await apiClient.patch(`/auth/users/${user.id}/roles`, { roles });
      show(`Papéis de ${user.email} atualizados.`, "success");
      reload();
    } catch (err) {
      show(err instanceof ApiError ? err.message : "Não foi possível salvar.", "error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Usuários"
        subtitle="Contas autocadastradas entram como VIEWER, sem nenhuma permissão, até um administrador atribuir o papel real"
      />
      <CardBody>
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} code={errorCode} />
        ) : data?.items.length === 0 ? (
          <EmptyState title="Nenhum usuário cadastrado ainda" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--color-border)" }}>
                  <th
                    className="pb-2 pr-4 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Usuário
                  </th>
                  <th
                    className="pb-2 pr-4 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Papéis
                  </th>
                  <th
                    className="pb-2 pr-4 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Status
                  </th>
                  <th className="pb-2 font-medium" style={{ color: "var(--color-text-muted)" }} />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((user) => {
                  const hasChanges =
                    JSON.stringify([...rolesFor(user)].sort()) !==
                    JSON.stringify([...user.roles].sort());
                  return (
                    <tr
                      key={user.id}
                      className="border-b"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <td className="py-3 pr-4 align-top">
                        <p className="font-medium" style={{ color: "var(--color-text)" }}>
                          {[user.nome, user.sobrenome].filter(Boolean).join(" ") || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {user.email}
                        </p>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_ROLES.map((role) => {
                            const active = rolesFor(user).includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleRole(user, role)}
                                aria-pressed={active}
                                className="cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all hover:-translate-y-0.5"
                                style={{
                                  borderColor: active
                                    ? "var(--color-primary)"
                                    : "var(--color-border)",
                                  backgroundColor: active
                                    ? "color-mix(in srgb, var(--color-primary) 14%, transparent)"
                                    : "transparent",
                                  color: active
                                    ? "var(--color-primary)"
                                    : "var(--color-text-muted)",
                                }}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Badge tone={user.accountStatus === "ACTIVE" ? "success" : "danger"}>
                          {user.accountStatus}
                        </Badge>
                      </td>
                      <td className="py-3 align-top text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!hasChanges || savingId === user.id}
                          onClick={() => handleSave(user)}
                        >
                          {savingId === user.id ? "Salvando…" : "Salvar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
