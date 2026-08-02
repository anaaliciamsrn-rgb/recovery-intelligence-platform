import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Levanta e ganha sombra/destaque de borda no hover — usar só em cards clicáveis/interativos, nunca em cards estáticos de conteúdo. */
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false, style, ...rest }: CardProps) {
  return (
    <div
      className={`group rounded-[var(--radius-lg)] border transition-all duration-200 ease-out hover:shadow-[var(--shadow-elevated)] ${interactive ? "cursor-pointer hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]" : "hover:-translate-y-0.5"} ${className}`}
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 pb-5 pt-4 ${className}`}>{children}</div>;
}
