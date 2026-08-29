import { useCallback, useRef, useState } from 'react';

type RunOptions = {
  readonly rethrow?: boolean;
};

/**
 * Shared in-flight / request-id helper for thin hooks.
 * Drops stale results when a newer request starts.
 */
export function useAsyncRunner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const run = useCallback(async <T,>(
    action: () => Promise<T>,
    mapError?: (caught: unknown) => string,
    options?: RunOptions,
  ): Promise<T | null> => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await action();
      if (currentRequest !== requestId.current) return null;
      setLoading(false);
      return data;
    } catch (caught) {
      if (currentRequest !== requestId.current) return null;
      setLoading(false);
      setError(mapError ? mapError(caught) : 'failed');
      if (options?.rethrow) throw caught;
      return null;
    }
  }, []);

  const runVoid = useCallback(async (
    action: () => Promise<void>,
    mapError?: (caught: unknown) => string,
  ): Promise<boolean> => {
    const result = await run(async () => {
      await action();
      return true;
    }, mapError);
    return result === true;
  }, [run]);

  const clearError = useCallback(() => setError(''), []);

  return {
    loading,
    error,
    setError,
    clearError,
    run,
    runVoid,
  };
}
