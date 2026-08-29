import { loadBarberAppointment } from '@/src/services/booking';

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('loadBarberAppointment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to the participant appointment row for a historical event while the event RPC migration is pending', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.barber_appointment_event' },
    });
    type Query = {
      readonly select: jest.Mock<Query, []>;
      readonly eq: jest.Mock<Query, [string, string]>;
      readonly maybeSingle: jest.Mock<Promise<unknown>, []>;
    };
    const query = {} as Query;
    Object.assign(query, {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      maybeSingle: jest.fn(async () => ({
        data: {
          id: 'appointment-1',
          starts_at: '2026-08-10T10:00:00.000Z',
          ends_at: '2026-08-10T10:30:00.000Z',
          price_dzd: 800,
          status: 'absent',
          services: { name: 'حلاقة شعر' },
          profiles: { name: 'سارة', phone: '0550000000' },
        },
        error: null,
      })),
    });
    mockFrom.mockReturnValue(query);

    await expect(loadBarberAppointment('appointment-1')).resolves.toEqual(
      expect.objectContaining({ id: 'appointment-1', customer_name: 'سارة' }),
    );
    expect(mockFrom).toHaveBeenCalledWith('appointments');
    expect(query.eq).toHaveBeenCalledWith('id', 'appointment-1');
  });
});
