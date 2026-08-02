import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard executivo", icon: "📊" },
  { to: "/app/operacional", label: "Operacional", icon: "🗂️" },
  { to: "/app/casos", label: "Casos", icon: "📋" },
  { to: "/app/relacionamentos", label: "Relacionamentos", icon: "🕸️" },
  { to: "/app/relatorio", label: "Relatório executivo", icon: "📄" },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: "/app/perfil", label: "Minha conta", icon: "👤" },
  { to: "/app/configuracoes", label: "Configurações", icon: "⚙️" },
];

/** Só quem tem `identity:manage-users` (papel ADMIN) vê este link — o backend também exige a mesma permissão, então esconder o link é só polimento, nunca o controle de acesso real. */
const ADMIN_NAV_ITEM: NavItem = { to: "/app/usuarios", label: "Usuários", icon: "🛡️" };

export function Sidebar() {
  const { brand } = useTheme();
  const { hasPermission } = useAuth();

  return (
    <aside
      className="no-print flex h-screen w-64 flex-shrink-0 flex-col border-r"
      style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {brand.productName.charAt(0)}
        </div>
        <span className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {brand.productName}
        </span>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(renderNavItem)}
      </nav>

      <nav
        aria-label="Navegação da conta"
        className="space-y-1 border-t px-3 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        {hasPermission("identity:manage-users") ? renderNavItem(ADMIN_NAV_ITEM) : null}
        {SECONDARY_NAV_ITEMS.map(renderNavItem)}
      </nav>

      <div
        className="border-t px-5 py-4 text-xs"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
      >
        v1.0 · Enterprise
      </div>
    </aside>
  );
}

function renderNavItem(item: NavItem) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/app"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${isActive ? "" : "hover:opacity-80"}`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive
          ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
          : "transparent",
        color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
      })}
    >
      <span aria-hidden>{item.icon}</span>
      {item.label}
    </NavLink>
  );
}
