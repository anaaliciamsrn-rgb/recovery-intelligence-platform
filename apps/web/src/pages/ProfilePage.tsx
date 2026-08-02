import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PasswordInput } from "../components/ui/PasswordInput";
import { PasswordStrengthMeter } from "../components/ui/PasswordStrengthMeter";

const MIN_PASSWORD_LENGTH = 12;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

/** Tela "Minha Conta" — lê e edita o perfil real via /auth/me/profile e /auth/me/change-password (identity module). */
export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { show } = useToast();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Minha conta" subtitle="Informações do seu perfil e da sua sessão" />
        <CardBody>
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (user.nome?.charAt(0) ?? user.email.charAt(0)).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                {[user.nome, user.sobrenome].filter(Boolean).join(" ") || user.email}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {user.email}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} tone="primary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <dl
            className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Membro desde
              </dt>
              <dd style={{ color: "var(--color-text)" }}>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Último acesso
              </dt>
              <dd style={{ color: "var(--color-text)" }}>{formatDate(user.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Permissões
              </dt>
              <dd style={{ color: "var(--color-text)" }}>{user.permissions?.length ?? 0}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <ProfileEditForm user={user} onSaved={refreshUser} showToast={show} />
      <ChangePasswordForm showToast={show} />
    </div>
  );
}

function ProfileEditForm({
  user,
  onSaved,
  showToast,
}: {
  user: {
    nome?: string | null;
    sobrenome?: string | null;
    empresa?: string | null;
    cargo?: string | null;
    avatarUrl?: string | null;
  };
  onSaved: () => Promise<void>;
  showToast: (message: string, variant?: "success" | "error" | "info") => void;
}) {
  const [nome, setNome] = useState(user.nome ?? "");
  const [sobrenome, setSobrenome] = useState(user.sobrenome ?? "");
  const [empresa, setEmpresa] = useState(user.empresa ?? "");
  const [cargo, setCargo] = useState(user.cargo ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.patch("/auth/me/profile", {
        nome: nome || undefined,
        sobrenome: sobrenome || undefined,
        empresa: empresa || null,
        cargo: cargo || null,
        avatarUrl: avatarUrl || null,
      });
      await onSaved();
      showToast("Perfil atualizado com sucesso.", "success");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Não foi possível salvar o perfil.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Editar perfil" />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={nome} onChange={setNome} />
            <Field label="Sobrenome" value={sobrenome} onChange={setSobrenome} />
            <Field label="Empresa" value={empresa} onChange={setEmpresa} />
            <Field label="Cargo" value={cargo} onChange={setCargo} />
          </div>
          <Field
            label="URL do avatar"
            value={avatarUrl}
            onChange={setAvatarUrl}
            placeholder="https://…"
          />
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function ChangePasswordForm({
  showToast,
}: {
  showToast: (message: string, variant?: "success" | "error" | "info") => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const passwordIsValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid = currentPassword.length > 0 && passwordIsValid && passwordsMatch;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    setIsSaving(true);
    try {
      await apiClient.post("/auth/me/change-password", { currentPassword, newPassword });
      showToast("Senha alterada com sucesso.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTouched(false);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Não foi possível alterar a senha.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Alterar senha"
        subtitle="Encerra a sessão atual apenas nesta troca — outras sessões continuam ativas"
      />
      <CardBody>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <div>
            <PasswordInput
              label="Nova senha"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onBlur={() => setTouched(true)}
            />
            <PasswordStrengthMeter password={newPassword} />
            {touched && newPassword.length > 0 && !passwordIsValid ? (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres
              </p>
            ) : null}
          </div>
          <div>
            <PasswordInput
              label="Confirmar nova senha"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setTouched(true)}
            />
            {touched && confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                As senhas não coincidem
              </p>
            ) : null}
          </div>
          <Button type="submit" variant="secondary" disabled={isSaving}>
            {isSaving ? "Alterando…" : "Alterar senha"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      />
    </div>
  );
}
