import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { PasswordStrengthMeter } from "../components/ui/PasswordStrengthMeter";

const MIN_PASSWORD_LENGTH = 12;

export function ResetPasswordPage() {
  const { brand } = useTheme();
  const { show } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordIsValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid = passwordIsValid && passwordsMatch && token.length > 0;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", { token, newPassword });
      show("Senha redefinida com sucesso. Entre com sua nova senha.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.";
      setError(message);
      show(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="w-full max-w-sm text-center">
          <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
            Link de redefinição inválido ou incompleto.
          </p>
          <Link
            to="/esqueci-minha-senha"
            className="mt-3 inline-block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Solicitar um novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-lg font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {brand.productName.charAt(0)}
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Criar nova senha
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-[var(--radius-lg)] border p-6"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
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

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] px-3 py-2 text-xs"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                color: "var(--color-danger)",
              }}
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Redefinindo…" : "Redefinir senha"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link
            to="/login"
            className="font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
