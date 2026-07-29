const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import * as bookingService from '@/src/services/booking';

const barberId = '11111111-2222-4333-8444-555555555555';
const appointmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('booking QR service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('decodes structured QR check-in results', async () => {
    mockRpc.mockResolvedValue({
      data: {
        code: 'TOO_EARLY',
        appointment_id: appointmentId,
        check_in_opens_at: '2026-07-29T12:30:00Z',
      },
      error: null,
    });

    await expect(bookingService.checkInWithQr(barberId)).resolves.toEqual({
      code: 'TOO_EARLY',
      appointmentId,
      checkInOpensAt: '2026-07-29T12:30:00Z',
    });
    expect(mockRpc).toHaveBeenCalledWith('check_in_with_barber_qr', {
      target_barber_id: barberId,
    });
  });

  it('calls the barber-only QR undo RPC', async () => {
    mockRpc.mockResolvedValue({ data: appointmentId, error: null });

    await expect(bookingService.undoQrCheckIn(appointmentId)).resolves.toBe(appointmentId);
    expect(mockRpc).toHaveBeenCalledWith('undo_qr_check_in', {
      target_appointment_id: appointmentId,
    });
  });
});
