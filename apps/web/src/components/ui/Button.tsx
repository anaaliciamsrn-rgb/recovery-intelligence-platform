import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-white",
  secondary: "border",
  ghost: "",
  danger: "text-white",
};

/**
 * `cursor-pointer` é explícito de propósito: browsers dão `cursor: default`
 * (seta, não mão) para `<button>` nativo — diferente de `<a>`, que já vem
 * com pointer por padrão. O reset do Tailwind não corrige isso (é
 * deliberado, considerado preferência de projeto, não bug do framework) —
 * sem esta linha, todo botão do sistema pareceria não-clicável ao passar o
 * mouse, exatamente o sintoma reportado.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  const variantStyle: Record<string, string> = {
    primary: "var(--color-primary)",
    danger: "var(--color-danger)",
  };

  const hoverClass = disabled
    ? ""
    : variant === "primary" || variant === "danger"
      ? "hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110"
      : "hover:-translate-y-0.5 hover:shadow-md hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]";

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all duration-150 ease-out active:scale-[0.97] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 ${disabled ? "" : "cursor-pointer"} ${sizeClass} ${VARIANT_CLASS[variant]} ${hoverClass} ${className}`}
      style={{
        backgroundColor:
          variant === "primary" || variant === "danger"
            ? variantStyle[variant]
            : variant === "secondary"
              ? "var(--color-bg-elevated)"
              : "transparent",
        borderColor: variant === "secondary" ? "var(--color-border)" : undefined,
        color: variant === "secondary" || variant === "ghost" ? "var(--color-text)" : undefined,
        boxShadow:
          variant === "primary"
            ? "0 1px 2px color-mix(in srgb, var(--color-primary) 40%, transparent)"
            : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
