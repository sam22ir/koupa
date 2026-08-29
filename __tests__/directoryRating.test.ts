import { directoryRatingText } from '@/src/features/customer-find/directoryRating';

describe('directoryRatingText', () => {
  it('does not present an unscored 0.0 as a rating', () => {
    expect(directoryRatingText(0, 'لا توجد تقييمات بعد')).toBe('لا توجد تقييمات بعد');
    expect(directoryRatingText(null, 'لا توجد تقييمات بعد')).toBe('لا توجد تقييمات بعد');
    expect(directoryRatingText(4.5, 'لا توجد تقييمات بعد')).toBe('★ 4.5');
  });
});
