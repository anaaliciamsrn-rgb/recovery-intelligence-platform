import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { apiClient, ApiError } from "../lib/api-client";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { PasswordStrengthMeter } from "../components/ui/PasswordStrengthMeter";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

interface FormState {
  nome: string;
  sobrenome: string;
  empresa: string;
  cargo: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

const INITIAL_STATE: FormState = {
  nome: "",
  sobrenome: "",
  empresa: "",
  cargo: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
};

/** Cadastro real, persistido no Postgres via POST /auth/register (RegisterUseCase) — não redireciona para uma sessão automática de propósito (o endpoint não emite tokens), sempre volta ao login. */
export function RegisterPage() {
  const { brand } = useTheme();
  const { show } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(key: keyof FormState): void {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  const emailIsValid = EMAIL_PATTERN.test(form.email);
  const passwordIsValid = form.password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = form.password === form.confirmPassword;
  const isFormValid =
    form.nome.trim().length > 0 &&
    form.sobrenome.trim().length > 0 &&
    emailIsValid &&
    passwordIsValid &&
    passwordsMatch &&
    form.acceptedTerms;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setTouched({
      nome: true,
      sobrenome: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptedTerms: true,
    });
    setError(null);

    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/register", {
        nome: form.nome,
        sobrenome: form.sobrenome,
        empresa: form.empresa || null,
        cargo: form.cargo || null,
        email: form.email,
        password: form.password,
      });
      show("Conta criada com sucesso. Entre com sua nova senha.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Não foi possível criar a conta. Tente novamente.";
      setError(message);
      show(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="animate-fade-in w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-lg font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {brand.productName.charAt(0)}
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Criar conta corporativa
          </h1>
          <p className="mt-1 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
            Acesso à {brand.productName} para sua equipe
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
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Nome"
              value={form.nome}
              onChange={(value) => update("nome", value)}
              onBlur={() => markTouched("nome")}
              error={touched.nome && form.nome.trim().length === 0 ? "Obrigatório" : undefined}
              autoComplete="given-name"
            />
            <TextField
              label="Sobrenome"
              value={form.sobrenome}
              onChange={(value) => update("sobrenome", value)}
              onBlur={() => markTouched("sobrenome")}
              error={
                touched.sobrenome && form.sobrenome.trim().length === 0 ? "Obrigatório" : undefined
              }
              autoComplete="family-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Empresa"
              value={form.empresa}
              onChange={(value) => update("empresa", value)}
              optional
              autoComplete="organization"
            />
            <TextField
              label="Cargo"
              value={form.cargo}
              onChange={(value) => update("cargo", value)}
              optional
              autoComplete="organization-title"
            />
          </div>

          <TextField
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
            onBlur={() => markTouched("email")}
            error={
              touched.email && form.email.length > 0 && !emailIsValid
                ? "Informe um e-mail válido"
                : undefined
            }
            autoComplete="email"
            placeholder="voce@empresa.com"
          />

          <div>
            <PasswordInput
              label="Senha"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              onBlur={() => markTouched("password")}
            />
            <PasswordStrengthMeter password={form.password} />
            {touched.password && form.password.length > 0 && !passwordIsValid ? (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres
              </p>
            ) : null}
          </div>

          <div>
            <PasswordInput
              label="Confirmar senha"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              onBlur={() => markTouched("confirmPassword")}
            />
            {touched.confirmPassword && form.confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
                As senhas não coincidem
              </p>
            ) : null}
          </div>

          <label
            className="flex items-start gap-2 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            <input
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={(event) => update("acceptedTerms", event.target.checked)}
              onBlur={() => markTouched("acceptedTerms")}
              className="mt-0.5 h-3.5 w-3.5 rounded"
              style={{ accentColor: "var(--color-primary)" }}
            />
            <span>
              Aceito os termos de uso e a política de privacidade da {brand.productName}.
              {touched.acceptedTerms && !form.acceptedTerms ? (
                <span className="ml-1 block" style={{ color: "var(--color-danger)" }}>
                  É necessário aceitar os termos para continuar
                </span>
              ) : null}
            </span>
          </label>

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
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Já tem uma conta?{" "}
          <Link
            to="/login"
            className="font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  optional,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | undefined;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
        {optional ? <span style={{ color: "var(--color-text-subtle)" }}> (opcional)</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none transition-colors"
        style={{
          borderColor: error ? "var(--color-danger)" : "var(--color-border)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      />
      {error ? (
        <p className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
