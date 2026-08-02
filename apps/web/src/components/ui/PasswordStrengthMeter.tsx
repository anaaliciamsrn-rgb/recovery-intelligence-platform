interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
}

/**
 * Heurística só de UX (comprimento + variedade de caracteres) — nunca a
 * fonte de verdade da política de senha, que é o backend (mínimo de 12
 * caracteres, deliberadamente sem exigência de complexidade — ver
 * `PlainPassword`, ADR 0010, alinhado a NIST 800-63B). Este medidor existe
 * só para incentivar uma senha melhor que o mínimo aceito.
 */
function evaluateStrength(password: string): StrengthResult {
  if (password.length === 0) {
    return { score: 0, label: "", color: "var(--color-border)" };
  }

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(score, 4);
  const levels = [
    { label: "Muito fraca", color: "var(--color-danger)" },
    { label: "Fraca", color: "var(--color-danger)" },
    { label: "Razoável", color: "var(--color-warning)" },
    { label: "Forte", color: "var(--color-success)" },
    { label: "Muito forte", color: "var(--color-success)" },
  ];

  return {
    score: clamped,
    label: levels[clamped]?.label ?? "",
    color: levels[clamped]?.color ?? "var(--color-border)",
  };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, color } = evaluateStrength(password);

  if (password.length === 0) return null;

  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: index < score ? color : "var(--color-border)" }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
