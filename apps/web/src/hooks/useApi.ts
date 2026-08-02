import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api-client";

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  /** Código de erro da API (ex.: "FORBIDDEN") — permite à página distinguir "sem permissão" de uma falha transitória, sem parsear a mensagem. */
  errorCode: string | null;
  isLoading: boolean;
  reload: () => void;
}

/**
 * Padroniza o ciclo carregando/erro/dado de qualquer chamada de leitura —
 * evita repetir o mesmo `useState` triplo em cada página do dashboard.
 * `deps` funciona como a dependency list de `useEffect`: mude para refazer
 * a chamada (ex.: ao trocar de dossiê selecionado).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[]): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Erro inesperado ao carregar dados");
        setErrorCode(err instanceof ApiError ? err.code : null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- `deps` já é a lista de dependências explícita do chamador

  useEffect(() => load(), [load, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, error, errorCode, isLoading, reload };
}
