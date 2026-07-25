import { emptyShopDraft, membershipStatusLabel, validateShopDraft } from '@/src/shops';

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
});
