/** Walk-in queue: shared types, limits and small pure helpers. */

export const QUEUE_MAX_ACTIVE = 20;
export const QUEUE_CALL_GRACE_MINUTES = 10;

export type QueueStatus = 'waiting' | 'called' | 'serving';
export type QueueSource = 'barber' | 'remote';
export type QueueAction = 'call' | 'start' | 'finish' | 'no_show' | 'remove';

export interface QueueEntry {
  readonly id: string;
  readonly name: string;
  readonly source: QueueSource;
  readonly status: QueueStatus;
  readonly service_name: string | null;
  readonly joined_at: string;
  readonly called_at: string | null;
}

export interface QueueService {
  readonly id: string;
  readonly name: string;
  readonly price_dzd: number;
  readonly duration_minutes: number;
}

/** The barber's live queue. */
export interface BarberQueue {
  readonly queue_open: boolean;
  /** Start of the next booked appointment, so walk-ins fill the gap before it. */
  readonly next_booking_at: string | null;
  readonly entries: readonly QueueEntry[];
  readonly services: readonly QueueService[];
}

/** A customer's own place in a line. Position is only set while waiting. */
export interface MyQueueEntry {
  readonly id: string;
  readonly barber_id: string;
  readonly barber_name: string;
  readonly service_name: string | null;
  readonly status: QueueStatus;
  readonly position: number | null;
  readonly waiting_count: number;
  readonly called_at: string | null;
}

export interface PublicQueueStatus {
  readonly queue_open: boolean;
  readonly waiting_count: number;
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function status(value: unknown): QueueStatus | null {
  return value === 'waiting' || value === 'called' || value === 'serving' ? value : null;
}

export function parseBarberQueue(value: unknown): BarberQueue {
  const data = isObject(value) ? value : {};
  const entries = (Array.isArray(data.entries) ? data.entries : []).flatMap((item): QueueEntry[] => {
    if (!isObject(item)) return [];
    const parsed = status(item.status);
    const id = text(item.id);
    if (!parsed || !id) return [];
    return [{
      id,
      name: text(item.name),
      source: item.source === 'remote' ? 'remote' : 'barber',
      status: parsed,
      service_name: nullableText(item.service_name),
      joined_at: text(item.joined_at),
      called_at: nullableText(item.called_at),
    }];
  });
  const services = (Array.isArray(data.services) ? data.services : []).flatMap((item): QueueService[] => {
    if (!isObject(item) || typeof item.id !== 'string') return [];
    return [{
      id: item.id,
      name: text(item.name),
      price_dzd: Number(item.price_dzd ?? 0),
      duration_minutes: Number(item.duration_minutes ?? 0),
    }];
  });
  return {
    queue_open: data.queue_open === true,
    next_booking_at: nullableText(data.next_booking_at),
    entries,
    services,
  };
}

export function parseMyQueueEntry(value: unknown): MyQueueEntry | null {
  if (!isObject(value)) return null;
  const parsed = status(value.status);
  const id = text(value.id);
  if (!parsed || !id) return null;
  return {
    id,
    barber_id: text(value.barber_id),
    barber_name: text(value.barber_name),
    service_name: nullableText(value.service_name),
    status: parsed,
    position: typeof value.position === 'number' ? value.position : null,
    waiting_count: Number(value.waiting_count ?? 0),
    called_at: nullableText(value.called_at),
  };
}

/** The buttons a barber sees for one entry. Only remote customers can be called. */
export function queueActionsFor(entry: Pick<QueueEntry, 'status' | 'source'>): readonly QueueAction[] {
  if (entry.status === 'serving') return ['finish'];
  if (entry.status === 'called') return ['start', 'no_show'];
  return entry.source === 'remote' ? ['call', 'start', 'remove'] : ['start', 'remove'];
}

/** Whole minutes left of the arrival grace period for a called customer (never below 0). */
export function callGraceMinutesLeft(calledAt: string | null, now = Date.now()): number {
  if (!calledAt) return QUEUE_CALL_GRACE_MINUTES;
  const elapsed = (now - new Date(calledAt).getTime()) / 60000;
  return Math.max(0, Math.ceil(QUEUE_CALL_GRACE_MINUTES - elapsed));
}
