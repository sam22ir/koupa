import { buildBarberCheckInPayload, parseBarberCheckInPayload } from '@/src/qr';

const barberId = '11111111-2222-4333-8444-555555555555';

describe('barber QR helpers', () => {
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

  it('rejects invalid payloads', () => {
    expect(parseBarberCheckInPayload('not-a-qr')).toBeNull();
    expect(parseBarberCheckInPayload('koupa://check-in/not-a-uuid')).toBeNull();
    expect(parseBarberCheckInPayload('')).toBeNull();
  });
});
