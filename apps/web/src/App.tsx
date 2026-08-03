import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoadingSkeleton } from "./components/ui/States";

const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
const ExecutiveDashboardPage = lazy(() =>
  import("./pages/ExecutiveDashboardPage").then((m) => ({ default: m.ExecutiveDashboardPage })),
);
const OperationalDashboardPage = lazy(() =>
  import("./pages/OperationalDashboardPage").then((m) => ({ default: m.OperationalDashboardPage })),
);
const CaseListPage = lazy(() =>
  import("./pages/CaseListPage").then((m) => ({ default: m.CaseListPage })),
);
const DossiePage = lazy(() =>
  import("./pages/DossiePage").then((m) => ({ default: m.DossiePage })),
);
const RelationshipGraphPage = lazy(() =>
  import("./pages/RelationshipGraphPage").then((m) => ({ default: m.RelationshipGraphPage })),
);
const ConsultaPage = lazy(() =>
  import("./pages/ConsultaPage").then((m) => ({ default: m.ConsultaPage })),
);
const ImportacoesPage = lazy(() =>
  import("./pages/ImportacoesPage").then((m) => ({ default: m.ImportacoesPage })),
);
const ExecutiveReportPage = lazy(() =>
  import("./pages/ExecutiveReportPage").then((m) => ({ default: m.ExecutiveReportPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const UsersAdminPage = lazy(() =>
  import("./pages/UsersAdminPage").then((m) => ({ default: m.UsersAdminPage })),
);

function PageFallback() {
  return (
    <div className="p-6">
      <LoadingSkeleton rows={6} />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
                <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/app"
                    element={
                      <AppShell title="Dashboard executivo">
                        <ExecutiveDashboardPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/operacional"
                    element={
                      <AppShell title="Operacional">
                        <OperationalDashboardPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/casos"
                    element={
                      <AppShell title="Casos">
                        <CaseListPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/dossies/:dossieId"
                    element={
                      <AppShell title="Dossiê">
                        <DossiePage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/consulta"
                    element={
                      <AppShell title="Consultar CPF/CNPJ">
                        <ConsultaPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/relacionamentos"
                    element={
                      <AppShell title="Relacionamentos societários">
                        <RelationshipGraphPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/importacoes"
                    element={
                      <AppShell title="Importações">
                        <ImportacoesPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/perfil"
                    element={
                      <AppShell title="Minha conta">
                        <ProfilePage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/configuracoes"
                    element={
                      <AppShell title="Configurações">
                        <SettingsPage />
                      </AppShell>
                    }
                  />
                  <Route
                    path="/app/usuarios"
                    element={
                      <AppShell title="Usuários">
                        <UsersAdminPage />
                      </AppShell>
                    }
                  />
                  <Route path="/app/relatorio" element={<ExecutiveReportPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
