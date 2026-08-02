import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5_000;

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-info)",
};

/**
 * Feedback global de "todo clique deve responder" — chamado por qualquer
 * fluxo assíncrono (login, cadastro, troca de senha, etc.) em vez de cada
 * página desenhar sua própria mensagem de sucesso/erro inline.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="no-print fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
        role="region"
        aria-live="polite"
        aria-label="Notificações"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-fade-in flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5 shadow-lg"
            style={{
              backgroundColor: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
            }}
          >
            <span aria-hidden className="text-base">
              {VARIANT_ICON[toast.variant]}
            </span>
            <p className="flex-1 text-sm" style={{ color: "var(--color-text)" }}>
              {toast.message}
            </p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar notificação"
              className="cursor-pointer text-xs opacity-60 transition-opacity hover:opacity-100"
              style={{ color: VARIANT_COLOR[toast.variant] }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast() precisa estar dentro de <ToastProvider>");
  return context;
}
