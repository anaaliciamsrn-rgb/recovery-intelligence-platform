import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSkeleton } from "./ui/States";

/** Redireciona para /login se não autenticado — a fonte real de verdade é sempre o backend (401), isto só evita a experiência de "flash" de uma tela protegida vazia. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-64">
          <LoadingSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
