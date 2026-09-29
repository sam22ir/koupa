import {
  callGraceMinutesLeft,
  parseBarberQueue,
  parseMyQueueEntry,
  queueActionsFor,
} from '@/src/queue';
import { mapRpcMessage, queueErrorMessage, toAppError } from '@/src/services/errors';

describe('queue parsing', () => {
  it('parses the barber queue and drops malformed entries', () => {
    const queue = parseBarberQueue({
      queue_open: true,
      next_booking_at: '2026-10-01T14:30:00Z',
      entries: [
        { id: 'a', name: 'سمير', source: 'barber', status: 'serving', service_name: 'حلاقة', joined_at: '2026-10-01T10:00:00Z', called_at: null },
        { id: 'b', name: 'ليلى', source: 'remote', status: 'waiting', service_name: null, joined_at: '2026-10-01T10:05:00Z', called_at: null },
        { id: 'c', name: 'قديم', source: 'remote', status: 'done', joined_at: '' },
        'not an entry',
      ],
      services: [{ id: 's1', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 }, { name: 'no id' }],
    });

    expect(queue.queue_open).toBe(true);
    expect(queue.next_booking_at).toBe('2026-10-01T14:30:00Z');
    expect(queue.entries.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(queue.entries[1]).toMatchObject({ source: 'remote', service_name: null });
    expect(queue.services).toEqual([{ id: 's1', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 }]);
  });

  it('treats an empty or invalid payload as a closed, empty queue', () => {
    expect(parseBarberQueue(null)).toEqual({ queue_open: false, next_booking_at: null, entries: [], services: [] });
  });

  it('parses a customer entry, with a position only while waiting', () => {
    expect(parseMyQueueEntry(null)).toBeNull();
    expect(parseMyQueueEntry({ id: 'x', status: 'done' })).toBeNull();
    expect(parseMyQueueEntry({
      id: 'e1', barber_id: 'b1', barber_name: 'أمين', service_name: 'حلاقة', status: 'waiting', position: 3, waiting_count: 5, called_at: null,
    })).toMatchObject({ position: 3, waiting_count: 5, status: 'waiting' });
    expect(parseMyQueueEntry({ id: 'e1', status: 'called', position: null, waiting_count: 2 })?.position).toBeNull();
  });
});

describe('queue actions', () => {
  it('offers only the moves each entry can make', () => {
    expect(queueActionsFor({ status: 'serving', source: 'barber' })).toEqual(['finish']);
    expect(queueActionsFor({ status: 'called', source: 'remote' })).toEqual(['start', 'no_show']);
    // Only remote customers can be called; a walk-in is already in the shop.
    expect(queueActionsFor({ status: 'waiting', source: 'remote' })).toEqual(['call', 'start', 'remove']);
    expect(queueActionsFor({ status: 'waiting', source: 'barber' })).toEqual(['start', 'remove']);
  });

  it('counts the arrival grace period down and never goes below zero', () => {
    const calledAt = '2026-10-01T10:00:00Z';
    expect(callGraceMinutesLeft(calledAt, Date.parse('2026-10-01T10:00:00Z'))).toBe(10);
    expect(callGraceMinutesLeft(calledAt, Date.parse('2026-10-01T10:04:30Z'))).toBe(6);
    expect(callGraceMinutesLeft(calledAt, Date.parse('2026-10-01T10:30:00Z'))).toBe(0);
    expect(callGraceMinutesLeft(null)).toBe(10);
  });
});

describe('queue errors', () => {
  it.each([
    ['Queue is closed', 'QUEUE_CLOSED'],
    ['The queue is full', 'QUEUE_FULL'],
    ['You are already in a queue', 'ALREADY_IN_QUEUE'],
    ['Queue entry cannot be updated', 'QUEUE_ENTRY_CHANGED'],
    ['A confirmed email is required', 'EMAIL_NOT_CONFIRMED'],
  ])('maps %s', (message, code) => {
    expect(mapRpcMessage(new Error(message))).toBe(code);
    expect(toAppError(new Error(message)).code).toBe(code);
  });

  it('shows a specific Arabic message for each queue failure', () => {
    expect(queueErrorMessage(new Error('The queue is full'))).toContain('ممتلئ');
    expect(queueErrorMessage(new Error('Queue is closed'))).toContain('مغلق');
    expect(queueErrorMessage(new Error('something else'))).toContain('تعذّر');
  });
});
