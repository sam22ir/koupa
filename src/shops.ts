export type ShopMembershipStatus = 'pending' | 'active' | 'rejected';

export interface ShopSummary {
  readonly id: string;
  readonly name: string;
  readonly bio: string | null;
  readonly maps_url: string | null;
  readonly city?: string | null;
  readonly neighborhood?: string | null;
  readonly average_rating: number;
  readonly rating_count: number;
  readonly owner_name: string;
}

export interface ShopBarber {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly is_owner: boolean;
}

export interface ShopProfile extends ShopSummary {
  readonly barbers: readonly ShopBarber[];
}

export interface ShopMembership {
  readonly id: string;
  readonly shop_id: string;
  readonly barber_id: string;
  readonly status: ShopMembershipStatus;
  readonly barber_name?: string;
  readonly barber_phone?: string;
  readonly shop_name?: string;
  readonly invited_by?: string | null;
  readonly invitation_expires_at?: string | null;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export type ShopRelationship =
  | { readonly kind: 'none' }
  | { readonly kind: 'request'; readonly membership: ShopMembership }
  | { readonly kind: 'invitation'; readonly membership: ShopMembership }
  | { readonly kind: 'member'; readonly membership: ShopMembership };

export function classifyShopRelationship(
  ownedShop: ShopSummary | null,
  membership: ShopMembership | null,
): ShopRelationship {
  if (ownedShop || !membership) return { kind: 'none' };
  if (membership.status === 'active') return { kind: 'member', membership };
  return membership.invited_by
    ? { kind: 'invitation', membership }
    : { kind: 'request', membership };
}

export function isInvitationExpired(
  membership: Pick<ShopMembership, 'invitation_expires_at'>,
  now = new Date(),
): boolean {
  return Boolean(
    membership.invitation_expires_at &&
      new Date(membership.invitation_expires_at).getTime() <= now.getTime(),
  );
}

export interface ShopBarberCandidate {
  readonly id: string;
  readonly name: string;
  readonly city: string | null;
  readonly neighborhood: string | null;
}

export interface BarberShopState {
  readonly ownedShop: ShopSummary | null;
  readonly membership: ShopMembership | null;
  readonly pendingRequests: readonly ShopMembership[];
  readonly members: readonly ShopMembership[];
}

export interface ShopDraft {
  readonly name: string;
  readonly bio: string;
  readonly mapsUrl: string;
  readonly latitude: string;
  readonly longitude: string;
}

export const emptyShopDraft: ShopDraft = {
  name: '',
  bio: '',
  mapsUrl: '',
  latitude: '',
  longitude: '',
};

export function validateShopDraft(draft: ShopDraft): string | null {
  if (draft.name.trim().length < 2) return 'validation';
  const hasMaps = Boolean(draft.mapsUrl.trim());
  const hasCoordinates = Boolean(draft.latitude.trim() && draft.longitude.trim());
  if (!hasMaps && !hasCoordinates) return 'locationRequired';
  if (hasCoordinates) {
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return 'validation';
  }
  return null;
}

export function membershipStatusLabel(status: ShopMembershipStatus): string {
  switch (status) {
    case 'pending':
      return 'قيد الانتظار';
    case 'active':
      return 'نشط';
    case 'rejected':
      return 'مرفوض';
  }
}

export function shopActivityActionLabel(action: string): string {
  switch (action) {
    case 'barber_settings_updated':
      return 'تحديث إعدادات الحلاق';
    case 'member_joined':
      return 'انضمام حلاق';
    case 'member_left':
      return 'مغادرة حلاق';
    case 'member_removed':
      return 'إزالة حلاق';
    case 'shop_created':
      return 'إنشاء المحل';
    default:
      return 'نشاط المحل';
  }
}
