import { loadNotifications } from '@/src/services/notifications';

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

type QueryChain = {
  readonly select: jest.Mock<QueryChain, []>;
  readonly order: jest.Mock<QueryChain, []>;
  readonly limit: jest.Mock<Promise<unknown>, []>;
};

function query(result: unknown): QueryChain {
  const chain = {} as QueryChain;
  Object.assign(chain, {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(async () => result),
  });
  return chain;
}

describe('notification service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to legacy notification rows while the destination migration is pending', async () => {
    mockFrom
      .mockReturnValueOnce(query({
        data: null,
        error: { code: '42703', message: 'column notifications.destination does not exist' },
      }))
      .mockReturnValueOnce(query({
        data: [{
          id: 'notification-1',
          title: 'موعد جديد',
          body: 'لديك موعد جديد',
          appointment_id: 'appointment-1',
          read_at: null,
          created_at: '2026-08-17T10:00:00.000Z',
        }],
        error: null,
      }));

    await expect(loadNotifications()).resolves.toEqual([
      expect.objectContaining({
        destination: { kind: 'notification' },
        appointment_id: 'appointment-1',
      }),
    ]);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
