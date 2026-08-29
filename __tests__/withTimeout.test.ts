import { withTimeout } from '@/src/utils/withTimeout';

describe('withTimeout', () => {
  it('rejects a promise that does not settle before the deadline', async () => {
    jest.useFakeTimers();
    const pending = new Promise<string>(() => undefined);
    const result = withTimeout(pending, 100, new Error('timed out'));
    jest.advanceTimersByTime(100);
    await expect(result).rejects.toThrow('timed out');
    jest.useRealTimers();
  });

  it('returns a settled value before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');
  });
});
