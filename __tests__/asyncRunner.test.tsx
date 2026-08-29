import { act, renderHook } from '@testing-library/react-native';

import { useAsyncRunner } from '@/src/services/asyncRunner';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('useAsyncRunner', () => {
  it('does not return stale data after a newer request starts', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const { result } = await renderHook(() => useAsyncRunner());
    let firstResult!: Promise<string | null>;
    let secondResult!: Promise<string | null>;

    await act(() => {
      firstResult = result.current.run(() => first.promise);
      secondResult = result.current.run(() => second.promise);
    });
    await act(async () => {
      second.resolve('new');
      await expect(secondResult).resolves.toBe('new');
    });
    await act(async () => {
      first.resolve('old');
      await expect(firstResult).resolves.toBeNull();
    });
  });
});
