import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, ApiError } from '../lib/apiClient';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => void;
}

export function useApi<T>(path: string, enabled = true): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    if (!enabled) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    apiClient
      .get<T>(path)
      .then(data => {
        if (mountedRef.current) setState({ data, loading: false, error: null });
      })
      .catch(err => {
        if (mountedRef.current) {
          const msg = err instanceof ApiError
            ? `Error ${err.status}: ${err.message}`
            : 'Backend tidak terjangkau. Pastikan server FastAPI berjalan.';
          setState(prev => ({ ...prev, loading: false, error: msg }));
        }
      });
  }, [path, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
