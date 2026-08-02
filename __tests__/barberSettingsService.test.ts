const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { emptyBarberSettingsDraft } from '@/src/barberSettings';
import { saveBarberScheduleWorkspace } from '@/src/services/barberSettings';

describe('barber Schedule workspace service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves the complete draft through one workspace RPC', async () => {
    mockRpc.mockResolvedValue({ error: null });

    await saveBarberScheduleWorkspace({
      settings: {
        ...emptyBarberSettingsDraft,
        services: [
          {
            id: 'service-1',
            name: 'حلاقة شعر',
            priceDzd: '800',
            durationMinutes: '30',
            isActive: true,
          },
        ],
      },
      exceptions: [
        {
          exceptionDate: '2026-08-01',
          isClosed: true,
          startsAt: '09:00',
          endsAt: '17:00',
          note: '',
        },
      ],
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('replace_barber_workspace_settings', {
      workspace: expect.objectContaining({
        services: [expect.objectContaining({ id: 'service-1' })],
        exceptions: [expect.objectContaining({ exception_date: '2026-08-01' })],
      }),
    });
  });
});
