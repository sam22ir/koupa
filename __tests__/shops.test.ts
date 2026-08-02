import {
  emptyShopDraft,
  formatMembershipActivity,
  membershipStatusLabel,
  validateShopDraft,
} from '@/src/shops';

describe('shop helpers', () => {
  it('requires a name and location', () => {
    expect(validateShopDraft(emptyShopDraft)).toBe('validation');
    expect(validateShopDraft({ ...emptyShopDraft, name: 'محل النور' })).toBe('locationRequired');
    expect(
      validateShopDraft({
        ...emptyShopDraft,
        name: 'محل النور',
        mapsUrl: 'https://maps.google.com/?q=36.7,3.0',
      }),
    ).toBeNull();
    expect(
      validateShopDraft({
        ...emptyShopDraft,
        name: 'محل النور',
        latitude: '36.7',
        longitude: '3.0',
      }),
    ).toBeNull();
  });

  it('labels membership statuses in Arabic', () => {
    expect(membershipStatusLabel('pending')).toBe('قيد الانتظار');
    expect(membershipStatusLabel('active')).toBe('نشط');
    expect(membershipStatusLabel('rejected')).toBe('مرفوض');
  });

  it('formats membership activity relative to an injected clock', () => {
    const now = new Date('2026-07-31T08:00:00.000Z');

    expect(formatMembershipActivity({ updated_at: undefined, created_at: undefined }, now)).toBe('لا يوجد نشاط مسجل');
    expect(formatMembershipActivity({ updated_at: '2026-07-31T07:30:00.000Z' }, now)).toBe('آخر تحديث اليوم');
    expect(formatMembershipActivity({ updated_at: '2026-07-30T07:30:00.000Z' }, now)).toBe('آخر تحديث أمس');
    expect(formatMembershipActivity({ updated_at: '2026-07-28T07:30:00.000Z' }, now)).toBe('آخر تحديث منذ 3 أيام');
    expect(formatMembershipActivity({ updated_at: 'not-a-date' }, now)).toBe('لا يوجد نشاط مسجل');
    expect(formatMembershipActivity({ created_at: '2026-07-31T07:30:00.000Z' }, now)).toBe('آخر تحديث اليوم');
    expect(formatMembershipActivity({ updated_at: 'not-a-date', created_at: '2026-07-31T07:30:00.000Z' }, now)).toBe('آخر تحديث اليوم');
  });
});
