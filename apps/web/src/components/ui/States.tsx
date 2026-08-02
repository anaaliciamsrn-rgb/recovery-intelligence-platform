import type { ReactNode } from "react";

/** Skeleton de carregamento — usado no lugar de spinners genéricos, mantém o layout estável enquanto os dados chegam. */
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded"
          style={{ backgroundColor: "var(--color-bg-muted)" }}
        />
      ))}
    </div>
  );
}

/**
 * `code === "FORBIDDEN"` ganha um tratamento à parte: um usuário sem a
 * permissão necessária (ex.: papel `VIEWER` recém-cadastrado, sem nenhuma
 * concessão ainda) não está diante de uma falha — está diante do sistema
 * funcionando exatamente como desenhado. Mostrar isso como o mesmo erro
 * vermelho genérico, com um botão "Tentar de novo" que nunca resolve nada,
 * lê como bug; a mensagem certa explica o que é e o que fazer a respeito.
 */
export function ErrorState({
  message,
  onRetry,
  code,
}: {
  message: string;
  onRetry?: () => void;
  code?: string | null;
}) {
  if (code === "FORBIDDEN") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-dashed px-6 py-10 text-center"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span className="text-2xl" aria-hidden>
          🔒
        </span>
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          Sua conta ainda não tem acesso a esta área
        </p>
        <p className="max-w-sm text-xs" style={{ color: "var(--color-text-muted)" }}>
          Contas novas começam sem nenhuma permissão atribuída, por segurança. Peça a um
          administrador da sua organização para conceder o papel adequado à sua conta.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-dashed px-6 py-10 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--color-danger)" }}>
        Não foi possível carregar estes dados
      </p>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {message}
      </p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="cursor-pointer text-xs font-medium underline transition-opacity hover:opacity-70"
          style={{ color: "var(--color-primary)" }}
        >
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? (
        <span className="mb-1" style={{ color: "var(--color-text-subtle)" }}>
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
        {title}
      </p>
      {description ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
