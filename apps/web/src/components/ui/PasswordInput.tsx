import { useId, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/** Campo de senha com alternância de visibilidade e aviso de Caps Lock — os dois pedidos de UX mais comuns em formulários de senha. */
export function PasswordInput({ label, id, className = "", ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  function handleKeyEvent(event: KeyboardEvent<HTMLInputElement>): void {
    if (typeof event.getModifierState === "function") {
      setCapsLockOn(event.getModifierState("CapsLock"));
    }
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          className={`w-full rounded-[var(--radius-sm)] border px-3 py-2 pr-10 text-sm outline-none transition-colors ${className}`}
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
          }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-sm opacity-60 transition-opacity hover:opacity-100"
          style={{ color: "var(--color-text-muted)" }}
        >
          {visible ? "🙈" : "👁️"}
        </button>
      </div>
      {capsLockOn ? (
        <p className="mt-1 text-xs" style={{ color: "var(--color-warning)" }} role="status">
          ⚠️ Caps Lock ativado
        </p>
      ) : null}
    </div>
  );
}
