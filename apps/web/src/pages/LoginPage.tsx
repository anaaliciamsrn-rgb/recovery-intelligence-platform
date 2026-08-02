import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";

interface OAuthProvidersStatus {
  google: boolean;
  microsoft: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export function LoginPage() {
  const { user, login } = useAuth();
  const { brand } = useTheme();
  const { show } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [touched, setTouched] = useState<{ email?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvidersStatus>({
    google: false,
    microsoft: false,
  });

  useEffect(() => {
    apiClient
      .get<OAuthProvidersStatus>("/auth/oauth/providers")
      .then(setOauthProviders)
      .catch(() => setOauthProviders({ google: false, microsoft: false }));
  }, []);

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const emailIsValid = EMAIL_PATTERN.test(email);
  const showEmailError = touched.email && email.length > 0 && !emailIsValid;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ email: true });
    setError(null);

    if (!emailIsValid || password.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password, rememberMe);
      show("Login realizado com sucesso.", "success");
      navigate("/app", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.";
      setError(message);
      show(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="animate-fade-in w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-lg font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {brand.productName.charAt(0)}
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {brand.productName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Entre com sua conta corporativa
          </p>
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
            <label
              htmlFor="login-email"
              className="mb-1 block text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "login-email-error" : undefined}
              className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
              style={{
                borderColor: showEmailError ? "var(--color-danger)" : "var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
              placeholder="voce@empresa.com"
            />
            {showEmailError ? (
              <p
                id="login-email-error"
                className="mt-1 text-xs"
                style={{ color: "var(--color-danger)" }}
              >
                Informe um e-mail válido
              </p>
            ) : null}
          </div>

          <PasswordInput
            label="Senha"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-3.5 w-3.5 rounded"
                style={{ accentColor: "var(--color-primary)" }}
              />
              Lembrar de mim
            </label>
            <Link
              to="/esqueci-minha-senha"
              className="font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Esqueci minha senha
            </Link>
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
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>

          {oauthProviders.google || oauthProviders.microsoft ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                  ou
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
              </div>
              <div className="space-y-2">
                <OAuthButton
                  provider="google"
                  available={oauthProviders.google}
                  label="Entrar com Google"
                  icon="🔵"
                />
                <OAuthButton
                  provider="microsoft"
                  available={oauthProviders.microsoft}
                  label="Entrar com Microsoft"
                  icon="🟦"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 opacity-60">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                  ou
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
              </div>
              <OAuthButton
                provider="google"
                available={false}
                label="Entrar com Google"
                icon="🔵"
              />
              <OAuthButton
                provider="microsoft"
                available={false}
                label="Entrar com Microsoft"
                icon="🟦"
              />
            </div>
          )}
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Não tem uma conta?{" "}
          <Link
            to="/cadastro"
            className="font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

function OAuthButton({
  provider,
  available,
  label,
  icon,
}: {
  provider: "google" | "microsoft";
  available: boolean;
  label: string;
  icon: string;
}) {
  if (!available) {
    return (
      <button
        type="button"
        disabled
        title="Integração disponível na versão corporativa — configure as credenciais OAuth para habilitar."
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-2 text-sm font-medium opacity-60"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <span aria-hidden>{icon}</span>
        {label}
        <span className="text-xs">— em breve</span>
      </button>
    );
  }

  return (
    <a
      href={`${API_BASE_URL}/auth/oauth/${provider}/authorize`}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </a>
  );
}
