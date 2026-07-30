import {
  classifyShopRelationship,
  isInvitationExpired,
  membershipStatusLabel,
  shopActivityActionLabel,
  type ShopMembership,
} from '@/src/shops';

const baseMembership: ShopMembership = {
  id: 'membership-1',
  shop_id: 'shop-1',
  barber_id: 'barber-1',
  status: 'pending',
  invited_by: null,
  invitation_expires_at: null,
  created_at: '2026-07-31T08:00:00.000Z',
  updated_at: '2026-07-31T08:00:00.000Z',
};

describe('shop relationship helpers', () => {
  it('classifies an unaffiliated barber', () => {
    expect(classifyShopRelationship(null, null)).toEqual({ kind: 'none' });
  });

  it('classifies outgoing requests and invitations separately', () => {
    expect(classifyShopRelationship(null, baseMembership)).toEqual({
      kind: 'request',
      membership: baseMembership,
    });

    const invitation = {
      ...baseMembership,
      invited_by: 'owner-1',
      invitation_expires_at: '2026-08-30T08:00:00.000Z',
    };
    expect(classifyShopRelationship(null, invitation)).toEqual({
      kind: 'invitation',
      membership: invitation,
    });
  });

  it('classifies active members and owned shops', () => {
    const active = { ...baseMembership, status: 'active' as const };
    expect(classifyShopRelationship(null, active)).toEqual({ kind: 'member', membership: active });
    expect(classifyShopRelationship({
      id: 'shop-1',
      name: 'صالون النخبة',
      bio: null,
      maps_url: null,
      city: 'الجزائر',
      neighborhood: 'حيدرة',
      average_rating: 4.8,
      rating_count: 12,
      owner_name: 'سمير',
    }, active)).toEqual({ kind: 'none' });
  });

  it('detects expired invitations using a supplied clock', () => {
    const now = new Date('2026-08-01T00:00:00.000Z');
    expect(isInvitationExpired({ invitation_expires_at: '2026-07-31T23:59:00.000Z' }, now)).toBe(true);
    expect(isInvitationExpired({ invitation_expires_at: '2026-08-02T00:00:00.000Z' }, now)).toBe(false);
    expect(isInvitationExpired({ invitation_expires_at: null }, now)).toBe(false);
  });

  it('provides stable Arabic labels for statuses and activity', () => {
    expect(membershipStatusLabel('pending')).toBe('قيد الانتظار');
    expect(membershipStatusLabel('active')).toBe('نشط');
    expect(membershipStatusLabel('rejected')).toBe('مرفوض');
    expect(shopActivityActionLabel('barber_settings_updated')).toBe('تحديث إعدادات الحلاق');
    expect(shopActivityActionLabel('unknown_action')).toBe('نشاط المحل');
  });
});
