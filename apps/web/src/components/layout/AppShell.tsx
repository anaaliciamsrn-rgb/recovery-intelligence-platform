import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Breadcrumb } from "./Breadcrumb";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Breadcrumb />
          {/* `key` força o React a remontar a região ao trocar de rota — é o que faz a animação de entrada rodar de novo a cada navegação. */}
          <div key={location.pathname} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
