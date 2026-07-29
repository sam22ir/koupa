const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const uuidRegex = new RegExp(`^${uuidPattern}$`, 'i');
const checkInPathPattern = new RegExp(`^/check-in/(${uuidPattern})/?$`, 'i');

export type CheckInResultCode =
  | 'CHECKED_IN'
  | 'ALREADY_PRESENT'
  | 'WRONG_BARBER'
  | 'TOO_EARLY'
  | 'TOO_LATE'
  | 'CANCELLED'
  | 'NO_ACTIVE_APPOINTMENT';

export interface CheckInResult {
  readonly code: CheckInResultCode;
  readonly appointmentId?: string;
  readonly barberName?: string;
  readonly expectedBarberName?: string;
  readonly serviceName?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly checkInOpensAt?: string;
}

const resultCodes = new Set<CheckInResultCode>([
  'CHECKED_IN',
  'ALREADY_PRESENT',
  'WRONG_BARBER',
  'TOO_EARLY',
  'TOO_LATE',
  'CANCELLED',
  'NO_ACTIVE_APPOINTMENT',
]);

export function buildBarberCheckInPayload(barberId: string): string {
  return `koupa://check-in/${barberId.toLowerCase()}`;
}

export function parseBarberCheckInPayload(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const allowed = url.protocol === 'koupa:'
      ? url.hostname === 'check-in'
      : url.protocol === 'https:' && url.hostname === 'koupa.app';
    if (!allowed) return null;
    const candidate = url.protocol === 'koupa:'
      ? url.pathname.slice(1)
      : url.pathname.match(checkInPathPattern)?.[1];
    return candidate && uuidRegex.test(candidate) ? candidate.toLowerCase() : null;
  } catch {
    // Fall through to plain-string matching.
  }

  const plainMatch = trimmed.match(new RegExp(`^/check-in/(${uuidPattern})/?$`, 'i'));
  return plainMatch?.[1]?.toLowerCase() ?? null;
}

function stringField(row: Record<string, unknown>, key: string): string | undefined {
  return typeof row[key] === 'string' ? row[key] : undefined;
}

export function parseCheckInResult(value: unknown): CheckInResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid QR check-in response');
  }

  const row = value as Record<string, unknown>;
  if (typeof row.code !== 'string' || !resultCodes.has(row.code as CheckInResultCode)) {
    throw new Error('Invalid QR check-in response');
  }

  return {
    code: row.code as CheckInResultCode,
    appointmentId: stringField(row, 'appointment_id'),
    barberName: stringField(row, 'barber_name'),
    expectedBarberName: stringField(row, 'expected_barber_name'),
    serviceName: stringField(row, 'service_name'),
    startsAt: stringField(row, 'starts_at'),
    endsAt: stringField(row, 'ends_at'),
    checkInOpensAt: stringField(row, 'check_in_opens_at'),
  };
}
