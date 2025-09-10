import { useState, useEffect, useCallback } from 'react';

interface UseCachedFetchOptions {
  url: string;
  dependencies?: unknown[];
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export const useCachedFetch = <T = unknown>({
  url,
  dependencies = [],
  enabled = true,
  onSuccess,
  onError
}: UseCachedFetchOptions) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // For now, just fetch data directly since DataCacheContext is not available
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setData(result);
      setError(null);
      
      if (onSuccess) onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [url, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add effect for dependencies
  useEffect(() => {
    fetchData();
  }, [fetchData, dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};






