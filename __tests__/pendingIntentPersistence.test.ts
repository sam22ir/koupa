const mockStore = new Map<string, string>();

jest.mock('@/lib/storage', () => ({
  appStorage: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStore.delete(key);
    },
  },
}));

import {
  clearPendingIntent,
  consumePendingIntent,
  getPendingIntent,
  hydratePendingIntent,
  setPendingIntentFromPath,
} from '@/src/navigation/pendingIntent';

const KEY = 'koupa:pending-intent:v1';
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('pending destination survives the app being closed', () => {
  beforeEach(async () => {
    clearPendingIntent();
    await flush();
    mockStore.clear();
  });

  it('saves a booking destination to storage and restores it after a cold start', async () => {
    setPendingIntentFromPath('/book/barber-1', { serviceId: 'cut', returnTo: '/barber/barber-1' });
    await flush();
    expect(JSON.parse(mockStore.get(KEY) ?? '{}').intent).toBe('/book/barber-1?serviceId=cut&returnTo=%2Fbarber%2Fbarber-1');

    // Simulate a fresh process: memory empty, storage intact.
    const saved = mockStore.get(KEY) as string;
    clearPendingIntent();
    await flush();
    mockStore.set(KEY, saved);
    expect(getPendingIntent()).toBeNull();

    await hydratePendingIntent();
    expect(getPendingIntent()).toBe('/book/barber-1?serviceId=cut&returnTo=%2Fbarber%2Fbarber-1');
    expect(consumePendingIntent('customer')).toBe('/book/barber-1?serviceId=cut&returnTo=%2Fbarber%2Fbarber-1');
    await flush();
    expect(mockStore.has(KEY)).toBe(false);
  });

  it('drops a destination older than a day', async () => {
    mockStore.set(KEY, JSON.stringify({ intent: '/book/barber-1', at: Date.now() - 25 * 60 * 60 * 1000 }));

    await hydratePendingIntent();

    expect(getPendingIntent()).toBeNull();
    await flush();
    expect(mockStore.has(KEY)).toBe(false);
  });

  it('ignores a stored destination that is not an allowed app route', async () => {
    mockStore.set(KEY, JSON.stringify({ intent: 'https://evil.example/x', at: Date.now() }));

    await hydratePendingIntent();

    expect(getPendingIntent()).toBeNull();
  });

  it('does not overwrite a destination that is already pending in memory', async () => {
    mockStore.set(KEY, JSON.stringify({ intent: '/book/old', at: Date.now() }));
    setPendingIntentFromPath('/book/new', {});
    await flush();

    await hydratePendingIntent();

    expect(getPendingIntent()).toBe('/book/new');
  });

  it('clears storage when the destination is cleared (sign-out)', async () => {
    setPendingIntentFromPath('/book/barber-1', {});
    await flush();
    expect(mockStore.has(KEY)).toBe(true);

    clearPendingIntent();
    await flush();

    expect(mockStore.has(KEY)).toBe(false);
  });
});
