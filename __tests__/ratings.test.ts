import { canEditRating, canRateAppointment, isValidStarRating, ratingSummaryLabel } from '@/src/ratings';

describe('rating helpers', () => {
  it('accepts only integer stars from 1 to 5', () => {
    expect(isValidStarRating(1)).toBe(true);
    expect(isValidStarRating(5)).toBe(true);
    expect(isValidStarRating(0)).toBe(false);
    expect(isValidStarRating(4.5)).toBe(false);
  });

  it('allows rating only completed appointments without an existing rating', () => {
    expect(canRateAppointment('completed', null)).toBe(true);
    expect(canRateAppointment('booked', null)).toBe(false);
    expect(
      canRateAppointment('completed', {
        id: 'r1',
        stars: 4,
        created_at: '2026-07-23T10:00:00.000Z',
        updated_at: '2026-07-23T10:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('allows editing ratings only within 24 hours of creation', () => {
    const createdAt = '2026-07-23T10:00:00.000Z';
    const rating = { id: 'r1', stars: 4, created_at: createdAt, updated_at: createdAt };
    expect(canEditRating(rating, Date.parse('2026-07-24T09:59:59.000Z'))).toBe(true);
    expect(canEditRating(rating, Date.parse('2026-07-24T10:00:01.000Z'))).toBe(false);
    expect(canEditRating(null)).toBe(false);
  });

  it('formats public rating summaries in Arabic', () => {
    expect(ratingSummaryLabel(0, 0)).toBe('لا توجد تقييمات بعد');
    expect(ratingSummaryLabel(4.26, 12)).toBe('4.3 ★ (12)');
  });
});
