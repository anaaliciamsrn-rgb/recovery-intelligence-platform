import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONE_STYLE: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--color-bg-muted)", fg: "var(--color-text-muted)" },
  success: { bg: "#16a34a1a", fg: "var(--color-success)" },
  warning: { bg: "#d977061a", fg: "var(--color-warning)" },
  danger: { bg: "#dc26261a", fg: "var(--color-danger)" },
  info: { bg: "#0ea5e91a", fg: "var(--color-info)" },
  primary: {
    bg: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
    fg: "var(--color-primary)",
  },
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const { bg, fg } = TONE_STYLE[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  );
}

const RISK_TONE: Record<string, BadgeTone> = {
  BAIXO_RISCO: "success",
  MEDIO_RISCO: "warning",
  ALTO_RISCO: "danger",
};

/** Badge de classificação de risco — mapeia o enum do backend (`classification` module) para a cor semântica correta. */
export function RiskBadge({ classificacao }: { classificacao: string }) {
  return (
    <Badge tone={RISK_TONE[classificacao] ?? "neutral"}>{classificacao.replaceAll("_", " ")}</Badge>
  );
}
