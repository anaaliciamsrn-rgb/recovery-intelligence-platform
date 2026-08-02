import { Link, useLocation } from "react-router-dom";

const SEGMENT_LABEL: Record<string, string> = {
  app: "Dashboard executivo",
  operacional: "Operacional",
  casos: "Casos",
  dossies: "Dossiê",
  relacionamentos: "Relacionamentos societários",
  relatorio: "Relatório executivo",
  perfil: "Minha conta",
  configuracoes: "Configurações",
};

/** Deriva o rastro de navegação puramente da URL — sem estado próprio, sempre em sincronia com a rota atual. */
export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  let accumulatedPath = "";
  const crumbs = segments.map((segment) => {
    accumulatedPath += `/${segment}`;
    const isId = /^[0-9a-f-]{8,}$/i.test(segment);
    return { path: accumulatedPath, label: isId ? "Detalhe" : (SEGMENT_LABEL[segment] ?? segment) };
  });

  return (
    <nav aria-label="Breadcrumb" className="no-print mb-4 flex items-center gap-1.5 text-xs">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden style={{ color: "var(--color-text-subtle)" }}>
              /
            </span>
          ) : null}
          {index === crumbs.length - 1 ? (
            <span style={{ color: "var(--color-text)" }} aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
