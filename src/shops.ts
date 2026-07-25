export type ShopMembershipStatus = 'pending' | 'active' | 'rejected';

export interface ShopSummary {
  readonly id: string;
  readonly name: string;
  readonly bio: string | null;
  readonly maps_url: string | null;
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
  readonly shop_name?: string;
}

export interface BarberShopState {
  readonly ownedShop: ShopSummary | null;
  readonly membership: ShopMembership | null;
  readonly pendingRequests: readonly ShopMembership[];
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
