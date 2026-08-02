import {
  buildBarberCheckInPayload,
  createQrMatrix,
  parseBarberCheckInPayload,
  parseCheckInResult,
} from '@/src/qr';

const barberId = '11111111-2222-4333-8444-555555555555';

describe('barber QR helpers', () => {
  it('creates a square QR matrix without an SVG renderer', () => {
    const matrix = createQrMatrix('koupa://check-in/barber-id');

    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    expect(matrix.some((row) => row.some(Boolean))).toBe(true);
  });

  it('builds a permanent koupa check-in payload', () => {
    expect(buildBarberCheckInPayload(barberId)).toBe(`koupa://check-in/${barberId}`);
  });

  it('parses koupa deep-link payloads', () => {
    expect(parseBarberCheckInPayload(`koupa://check-in/${barberId}`)).toBe(barberId);
    expect(parseBarberCheckInPayload(`koupa://check-in/${barberId.toUpperCase()}`)).toBe(barberId);
  });

  it('parses https-style and path-only payloads', () => {
    expect(parseBarberCheckInPayload(`https://koupa.app/check-in/${barberId}`)).toBe(barberId);
    expect(parseBarberCheckInPayload(`/check-in/${barberId}`)).toBe(barberId);
  });

  it('rejects unrelated web origins and query-only payloads', () => {
    expect(parseBarberCheckInPayload(`https://evil.example/check-in/${barberId}`)).toBeNull();
    expect(parseBarberCheckInPayload(`https://koupa.app/?barberId=${barberId}`)).toBeNull();
  });

  it('rejects invalid payloads', () => {
    expect(parseBarberCheckInPayload('not-a-qr')).toBeNull();
    expect(parseBarberCheckInPayload('koupa://check-in/not-a-uuid')).toBeNull();
    expect(parseBarberCheckInPayload('')).toBeNull();
  });

  it('decodes a checked-in response', () => {
    expect(parseCheckInResult({
      code: 'CHECKED_IN',
      appointment_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      barber_name: 'أحمد',
      service_name: 'حلاقة شعر',
      starts_at: '2026-07-29T13:00:00Z',
      ends_at: '2026-07-29T13:30:00Z',
    })).toEqual({
      code: 'CHECKED_IN',
      appointmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      barberName: 'أحمد',
      serviceName: 'حلاقة شعر',
      startsAt: '2026-07-29T13:00:00Z',
      endsAt: '2026-07-29T13:30:00Z',
    });
  });

  it('rejects unknown result codes', () => {
    expect(() => parseCheckInResult({ code: 'MAYBE' })).toThrow('Invalid QR check-in response');
  });
});
