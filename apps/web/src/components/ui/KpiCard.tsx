import type { ReactNode } from "react";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  accent?: "primary" | "success" | "warning" | "danger";
}

const ACCENT_COLOR: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

const TREND_COLOR: Record<NonNullable<KpiCardProps["trend"]>["direction"], string> = {
  up: "var(--color-success)",
  down: "var(--color-danger)",
  flat: "var(--color-text-muted)",
};

const TREND_SYMBOL: Record<NonNullable<KpiCardProps["trend"]>["direction"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

/** Bloco de KPI do dashboard executivo — um número grande, um rótulo, e opcionalmente uma tendência. */
export function KpiCard({ label, value, icon, trend, accent = "primary" }: KpiCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
        {icon ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${ACCENT_COLOR[accent]} 14%, transparent)`,
              color: ACCENT_COLOR[accent],
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className="mt-3 text-2xl font-semibold tabular-nums"
        style={{ color: "var(--color-text)" }}
      >
        {value}
      </p>
      {trend ? (
        <p className="mt-1.5 text-xs font-medium" style={{ color: TREND_COLOR[trend.direction] }}>
          {TREND_SYMBOL[trend.direction]} {trend.label}
        </p>
      ) : null}
    </Card>
  );
}
