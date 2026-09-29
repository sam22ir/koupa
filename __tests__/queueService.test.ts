const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import * as queue from '@/src/services/queue';

describe('queue service', () => {
  beforeEach(() => mockRpc.mockReset());

  it('reads the barber queue through the RPC and parses it', async () => {
    mockRpc.mockResolvedValue({ data: { queue_open: true, entries: [], services: [], next_booking_at: null }, error: null });
    await expect(queue.getBarberQueue()).resolves.toMatchObject({ queue_open: true, entries: [] });
    expect(mockRpc).toHaveBeenCalledWith('get_barber_queue');
  });

  it('sends the documented parameter names', async () => {
    mockRpc.mockResolvedValue({ data: 'entry-1', error: null });
    await queue.addWalkin('  سمير ', 'svc-1');
    expect(mockRpc).toHaveBeenLastCalledWith('add_walkin', { guest_name_value: 'سمير', service_id_value: 'svc-1' });

    await queue.joinQueue('barber-1', 'svc-1');
    expect(mockRpc).toHaveBeenLastCalledWith('join_queue', { barber_id_value: 'barber-1', service_id_value: 'svc-1' });

    mockRpc.mockResolvedValue({ data: null, error: null });
    await queue.updateQueueEntry('e1', 'call');
    expect(mockRpc).toHaveBeenLastCalledWith('update_queue_entry', { entry_id_value: 'e1', action_value: 'call' });
    await queue.leaveQueue('e1');
    expect(mockRpc).toHaveBeenLastCalledWith('leave_queue', { entry_id_value: 'e1' });
    await queue.setQueueOpen(true);
    expect(mockRpc).toHaveBeenLastCalledWith('set_queue_open', { open_value: true });
  });

  it('turns database errors into typed app errors', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'The queue is full' } });
    await expect(queue.joinQueue('b', 's')).rejects.toMatchObject({ code: 'QUEUE_FULL' });
  });

  it('fails when the server returns no entry id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(queue.addWalkin('سمير', 's')).rejects.toBeTruthy();
  });

  it('reads the public status and my own entry', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ queue_open: true, waiting_count: 4 }], error: null });
    await expect(queue.getPublicQueueStatus('b')).resolves.toEqual({ queue_open: true, waiting_count: 4 });
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(queue.getPublicQueueStatus('b')).resolves.toBeNull();
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(queue.getMyQueueEntry()).resolves.toBeNull();
  });
});
