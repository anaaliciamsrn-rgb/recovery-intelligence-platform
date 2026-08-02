import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, setAccessToken, setUnauthorizedHandler } from "../lib/api-client";

export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
  /** Aditivo (fase de polimento UX/UI) — ausente em respostas antigas de login, sempre presente em `/auth/me`. */
  permissions?: string[];
  nome?: string | null;
  sobrenome?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  /** `true` só durante a tentativa inicial de reidratar a sessão a partir do cookie de refresh. */
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  /** Rebusca `/auth/me` — chamado depois de editar o perfil, para o resto da UI (ex.: Topbar) refletir a mudança sem precisar de F5. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

interface RefreshResponse {
  accessToken: string;
}

interface MeResponse {
  user: CurrentUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", undefined, { skipAuthRedirect: true });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    // Reidrata a sessão a partir do cookie httpOnly de refresh — sem isso, um F5 sempre deslogaria o usuário.
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await apiClient.post<RefreshResponse>("/auth/refresh", undefined, {
          skipAuthRedirect: true,
        });
        setAccessToken(refreshed.accessToken);
        const me = await apiClient.get<MeResponse>("/auth/me");
        if (!cancelled) setUser(me.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = true) => {
    const result = await apiClient.post<LoginResponse>(
      "/auth/login",
      { email, password, rememberMe },
      { skipAuthRedirect: true },
    );
    setAccessToken(result.accessToken);
    // O corpo de /auth/login só tem {id,email,roles} (formato original, ver
    // AuthController) — busca o perfil completo (permissões, nome, etc.) na
    // sequência, mesmo dado que /auth/me já devolve no bootstrap pós-F5.
    const me = await apiClient.get<MeResponse>("/auth/me");
    setUser(me.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await apiClient.get<MeResponse>("/auth/me");
    setUser(me.user);
  }, []);

  const hasRole = useCallback((role: string) => user?.roles.includes(role) ?? false, [user]);
  const hasPermission = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, hasRole, hasPermission, refreshUser }),
    [user, isLoading, login, logout, hasRole, hasPermission, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth() precisa estar dentro de <AuthProvider>");
  return context;
}
