import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Button } from "../components/ui/Button";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /auth/forgot-password sempre responde 200 genérico, exista ou não o
 * e-mail (ver RequestPasswordResetUseCase, ADR 0010) — a tela reflete essa
 * mesma disciplina: a mensagem de sucesso nunca confirma nem nega que a
 * conta existe.
 */
export function ForgotPasswordPage() {
  const { brand } = useTheme();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailIsValid = EMAIL_PATTERN.test(email);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (!emailIsValid) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível processar o pedido. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            Esqueci minha senha
          </h1>
        </div>

        <div
          className="rounded-[var(--radius-lg)] border p-6"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {submitted ? (
            <div className="animate-fade-in space-y-3 text-center">
              <span className="text-2xl" aria-hidden>
                ✅
              </span>
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                Se este e-mail estiver cadastrado, você receberá um link de redefinição em breve.
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Verifique também a caixa de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
              </p>

              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  E-mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={touched && email.length > 0 && !emailIsValid}
                  className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    borderColor:
                      touched && email.length > 0 && !emailIsValid
                        ? "var(--color-danger)"
                        : "var(--color-border)",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  placeholder="voce@empresa.com"
                />
                {touched && email.length > 0 && !emailIsValid ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                    Informe um e-mail válido
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
                {isSubmitting ? "Enviando…" : "Enviar link de redefinição"}
              </Button>
            </form>
          )}
        </div>

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
