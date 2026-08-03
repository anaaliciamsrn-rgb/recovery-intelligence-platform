import type { ApiErrorResponse } from "@rip/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Chamado pelo `AuthProvider` ao logar/deslogar — o client nunca lê localStorage diretamente (token de acesso só vive em memória, nunca persistido). */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Chamado pelo `AuthProvider` para reagir a uma sessão expirada detectada pelo client (evita importar AuthContext aqui e criar um ciclo). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Corpo já é FormData (upload de arquivo) — não serializa como JSON nem define Content-Type (o browser define o boundary). */
  isFormData?: boolean;
  /** Rotas de login/refresh não devem reagir a 401 com logout automático — evita loop. */
  skipAuthRedirect?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, isFormData, skipAuthRedirect } = options;

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!isFormData && body !== undefined) headers["Content-Type"] = "application/json";

  const fetchInit: RequestInit = { method, headers, credentials: "include" };
  if (body !== undefined) {
    fetchInit.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), fetchInit);

  if (response.status === 401 && !skipAuthRedirect) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options);
    onUnauthorized?.();
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : undefined;

  if (!response.ok) {
    const errorBody = payload as ApiErrorResponse | undefined;
    throw new ApiError(
      errorBody?.error.code ?? "UNKNOWN",
      errorBody?.error.message ?? `Erro ${response.status}`,
      response.status,
      errorBody?.error.requestId,
      errorBody?.error.details,
    );
  }

  return payload as T;
}

/**
 * Baixa um arquivo binário (ex.: planilha .xlsx) autenticado e dispara o
 * download nativo do navegador — separado de `request()` porque a resposta
 * nunca é JSON (o parsing de `contentType` ali assumiria corpo vazio).
 */
async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(buildUrl(path), { headers, credentials: "include" });
  if (!response.ok) {
    throw new ApiError(
      "DOWNLOAD_FAILED",
      `Erro ${response.status} ao baixar arquivo`,
      response.status,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    request<T>(path, query === undefined ? { method: "GET" } : { method: "GET", query }),
  post: <T>(path: string, body?: unknown, options?: Partial<RequestOptions>) =>
    request<T>(path, { method: "POST", body, ...options }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string, query?: RequestOptions["query"]) =>
    request<T>(path, query === undefined ? { method: "DELETE" } : { method: "DELETE", query }),
  downloadFile,
};
