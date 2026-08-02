import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="no-print flex h-16 flex-shrink-0 items-center justify-between border-b px-6"
      style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}
    >
      <h1 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleColorScheme}
          aria-label="Alternar tema claro/escuro"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm transition-all hover:scale-110"
          style={{ color: "var(--color-text-muted)", backgroundColor: "transparent" }}
        >
          {colorScheme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Menu do usuário"
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
            style={{ color: "var(--color-text)" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (user?.email ?? "?").charAt(0).toUpperCase()
              )}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-[12rem] truncate font-medium">{user?.email ?? "—"}</span>
              <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
                {user?.roles.join(", ") ?? ""}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label="Menu do usuário"
              className="animate-scale-in absolute right-0 z-10 mt-2 w-44 rounded-[var(--radius-md)] border py-1 shadow-lg"
              style={{
                backgroundColor: "var(--color-bg-elevated)",
                borderColor: "var(--color-border)",
              }}
            >
              <Link
                role="menuitem"
                to="/app/perfil"
                onClick={() => setMenuOpen(false)}
                className="block w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                style={{ color: "var(--color-text)" }}
              >
                👤 Minha conta
              </Link>
              <Link
                role="menuitem"
                to="/app/configuracoes"
                onClick={() => setMenuOpen(false)}
                className="block w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                style={{ color: "var(--color-text)" }}
              >
                ⚙️ Configurações
              </Link>
              <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
              <button
                role="menuitem"
                onClick={handleLogout}
                className="block w-full cursor-pointer px-4 py-2 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
                style={{ color: "var(--color-danger)" }}
              >
                🚪 Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
