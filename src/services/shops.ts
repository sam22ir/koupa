import { supabase } from '@/lib/supabase';
import { haversineKm, parseCoordinatesFromMapsUrl, parseGeoPoint, type GeoPoint } from '@/src/location';
import type {
  BarberShopState,
  ShopBarberCandidate,
  ShopDraft,
  ShopMembership,
  ShopProfile,
  ShopSummary,
} from '@/src/shops';
import { classifyShopRelationship, validateShopDraft } from '@/src/shops';
import type { BarberScheduleWorkspaceDraft } from '@/src/features/barber-schedule/model';
import {
  loadOwnerManagedSettings,
  saveOwnerManagedSettings,
} from '@/src/services/barberSettings';
import {
  mapOwnerWorkspacePayload,
  SEARCH_PAGE_SIZE,
  toWorkspaceRpcPayload,
} from '@/src/services/mappers/schedule';
import { AppError, toAppError } from '@/src/services/errors';
import { excludeBlocked, loadBlockedUserIds } from '@/src/services/ugcModeration';

type MembershipRow = {
  readonly id: string;
  readonly shop_id: string;
  readonly barber_id: string;
  readonly status: ShopMembership['status'];
  readonly barber_name?: string | null;
  readonly barber_phone?: string | null;
  readonly shop_name?: string | null;
  readonly invited_by?: string | null;
  readonly invitation_expires_at?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
  readonly shops?: { readonly name?: string | null } | readonly { readonly name?: string | null }[] | null;
};

type ShopSearchRow = {
  readonly id: string;
  readonly name: string;
  readonly bio: string | null;
  readonly maps_url: string | null;
  readonly city?: string | null;
  readonly neighborhood?: string | null;
  readonly average_rating: number | null;
  readonly rating_count: number | null;
  readonly owner_name: string;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly distance_km?: number | null;
};

type PublicShopOwnerRow = {
  readonly name: string;
  readonly city: string | null;
  readonly neighborhood: string | null;
  readonly role: string;
  readonly is_published: boolean;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly maps_url: string | null;
};

type PublicShopRow = {
  readonly id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly bio: string | null;
  readonly maps_url: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly average_rating: number | null;
  readonly rating_count: number | null;
  readonly owner: PublicShopOwnerRow | readonly PublicShopOwnerRow[] | null;
};

function isMissingVersionedShopSearch(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return error?.code === 'PGRST202' && error.message?.includes('search_published_shops_v2') === true;
}

function isMissingVersionedShopProfile(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return error?.code === 'PGRST202' && error.message?.includes('get_public_shop_profile_v2') === true;
}

function isMissingNearbyShopSearch(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return error?.code === 'PGRST202' && error.message?.includes('search_nearby_shops') === true;
}

function oneRelation<T>(relation: T | readonly T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return (relation[0] as T | undefined) ?? null;
  return (relation as T | null | undefined) ?? null;
}

function matchesNearbyQuery(row: PublicShopRow, owner: PublicShopOwnerRow, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('ar-DZ');
  if (!normalizedQuery) return true;
  return [
    row.name,
    row.bio ?? '',
    owner.name,
    owner.city ?? '',
    owner.neighborhood ?? '',
  ]
    .join(' ')
    .toLocaleLowerCase('ar-DZ')
    .includes(normalizedQuery);
}

async function searchNearbyPublicRows(
  origin: GeoPoint,
  query: string,
  page: number,
  radiusKm: number,
): Promise<readonly ShopSummary[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id,owner_id,name,bio,maps_url,latitude,longitude,average_rating,rating_count,owner:profiles!shops_owner_id_fkey(name,city,neighborhood,role,is_published,latitude,longitude,maps_url)');
  if (error) throw toAppError(error);

  const safeRadius = Math.min(Math.max(Number.isFinite(radiusKm) ? radiusKm : 25, 1), 100);
  const blocked = new Set(await loadBlockedUserIds());
  const rows = (data ?? []) as unknown as readonly PublicShopRow[];
  const matches = rows.flatMap((row) => {
    const owner = oneRelation(row.owner);
    if (!owner || blocked.has(row.owner_id) || owner.role !== 'barber' || !owner.is_published || !matchesNearbyQuery(row, owner, query)) return [];

    const location = parseGeoPoint(row.latitude, row.longitude)
      ?? parseGeoPoint(owner.latitude, owner.longitude)
      ?? parseCoordinatesFromMapsUrl(row.maps_url ?? '')
      ?? parseCoordinatesFromMapsUrl(owner.maps_url ?? '');
    if (!location) return [];

    const distance = haversineKm(origin, location);
    if (distance > safeRadius) return [];
    return [{
      id: row.id,
      name: row.name,
      bio: row.bio,
      maps_url: row.maps_url,
      city: owner.city,
      neighborhood: owner.neighborhood,
      average_rating: Number(row.average_rating ?? 0),
      rating_count: row.rating_count ?? 0,
      owner_name: owner.name,
      latitude: location.latitude,
      longitude: location.longitude,
      distance_km: Number(distance.toFixed(2)),
    } satisfies ShopSummary];
  });

  matches.sort((left, right) =>
    (left.distance_km ?? Number.POSITIVE_INFINITY) - (right.distance_km ?? Number.POSITIVE_INFINITY)
      || left.name.localeCompare(right.name)
      || left.id.localeCompare(right.id));
  const offset = Math.max(page, 0) * SEARCH_PAGE_SIZE;
  return matches.slice(offset, offset + SEARCH_PAGE_SIZE);
}

export function mapShopMembershipRow(row: MembershipRow): ShopMembership {
  const shopRelation = row.shops;
  const relationName = Array.isArray(shopRelation)
    ? shopRelation[0]?.name
    : shopRelation && 'name' in shopRelation
      ? shopRelation.name
      : undefined;
  return {
    id: row.id,
    shop_id: row.shop_id,
    barber_id: row.barber_id,
    status: row.status,
    barber_name: row.barber_name ?? undefined,
    barber_phone: row.barber_phone ?? undefined,
    shop_name: row.shop_name ?? relationName ?? undefined,
    invited_by: row.invited_by ?? null,
    invitation_expires_at: row.invitation_expires_at ?? null,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export async function loadBarberShopState(userId: string): Promise<BarberShopState> {
  const [ownedResult, membershipResult] = await Promise.all([
    supabase.from('shops').select('id,name,bio,maps_url,average_rating,rating_count,owner_id').eq('owner_id', userId).maybeSingle(),
    supabase
      .from('shop_memberships')
      .select('id,shop_id,barber_id,status,invited_by,invitation_expires_at,shops(name)')
      .eq('barber_id', userId)
      .in('status', ['pending', 'active'])
      .maybeSingle(),
  ]);
  if (ownedResult.error) throw toAppError(ownedResult.error);
  if (membershipResult.error) throw toAppError(membershipResult.error);

  const ownedShop = ownedResult.data;
  let members: ShopMembership[] = [];
  if (ownedShop) {
    const membersResult = await supabase.rpc('shop_owner_members', { target_shop_id: ownedShop.id });
    if (membersResult.error) throw toAppError(membersResult.error);
    members = (membersResult.data ?? []).map((item) => mapShopMembershipRow({
      id: item.id,
      shop_id: ownedShop.id,
      barber_id: item.barber_id,
      status: item.status,
      barber_name: item.barber_name,
      barber_phone: item.barber_phone,
      invited_by: item.invited_by,
      invitation_expires_at: item.invitation_expires_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  }

  const membershipRow = membershipResult.data as MembershipRow | null;
  const membership = membershipRow ? mapShopMembershipRow(membershipRow) : null;
  const mappedOwnedShop = ownedShop
    ? {
        id: ownedShop.id,
        name: ownedShop.name,
        bio: ownedShop.bio,
        maps_url: ownedShop.maps_url,
        average_rating: Number(ownedShop.average_rating ?? 0),
        rating_count: ownedShop.rating_count ?? 0,
        owner_name: '',
      }
    : null;

  return {
    ownedShop: mappedOwnedShop,
    membership,
    relationship: classifyShopRelationship(mappedOwnedShop, membership),
    pendingRequests: members.filter((member) => member.status === 'pending' && !member.invited_by),
    members,
  };
}

export async function createShop(draft: ShopDraft): Promise<void> {
  const validation = validateShopDraft(draft);
  if (validation === 'locationRequired') throw new AppError('LOCATION_REQUIRED');
  if (validation) throw new AppError('VALIDATION');

  const { error } = await supabase.rpc('create_shop', {
    shop_name: draft.name.trim(),
    shop_bio: draft.bio.trim() || undefined,
    shop_maps_url: draft.mapsUrl.trim() || undefined,
    shop_latitude: draft.latitude.trim() ? Number(draft.latitude) : undefined,
    shop_longitude: draft.longitude.trim() ? Number(draft.longitude) : undefined,
  });
  if (error) throw toAppError(error);
}

export async function requestJoinShop(shopId: string): Promise<void> {
  const { error } = await supabase.rpc('request_join_shop', { target_shop_id: shopId });
  if (error) throw toAppError(error);
}

export async function respondShopMembership(membershipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_shop_membership', {
    target_membership_id: membershipId,
    accept,
  });
  if (error) throw toAppError(error);
}

export async function respondShopInvitation(membershipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_shop_invitation', {
    target_membership_id: membershipId,
    accept,
  });
  if (error) throw toAppError(error);
}

export async function searchShopBarberCandidates(query: string, page = 0): Promise<readonly ShopBarberCandidate[]> {
  const { data, error } = await supabase.rpc('search_published_barbers', {
    search_query: query,
    city_query: '',
    page_number: page,
  });
  if (error) throw toAppError(error);
  return excludeBlocked((data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    city: item.city,
    neighborhood: item.neighborhood,
  })));
}

export async function inviteBarberToShop(shopId: string, barberId: string): Promise<void> {
  const { error } = await supabase.rpc('invite_barber_to_shop', {
    target_shop_id: shopId,
    target_barber_id: barberId,
  });
  if (error) throw toAppError(error);
}

export async function leaveShop(): Promise<void> {
  const { error } = await supabase.rpc('leave_shop');
  if (error) throw toAppError(error);
}

export async function deleteOwnedShop(): Promise<void> {
  const { error } = await supabase.rpc('delete_owned_shop');
  if (error) throw toAppError(error);
}

export async function searchShops(query: string, page = 0): Promise<readonly ShopSummary[]> {
  const versioned = await supabase.rpc('search_published_shops_v2', {
    search_query: query,
    page_number: page,
  });
  let rows: readonly ShopSearchRow[];
  if (!versioned.error) {
    rows = (versioned.data ?? []) as readonly ShopSearchRow[];
  } else if (isMissingVersionedShopSearch(versioned.error)) {
    const legacy = await supabase.rpc('search_published_shops', {
      search_query: query,
      page_number: page,
    });
    if (legacy.error) throw toAppError(legacy.error);
    rows = (legacy.data ?? []).map((item) => ({
      ...item,
      city: null,
      neighborhood: null,
    }));
  } else {
    throw toAppError(versioned.error);
  }

  return filterBlockedShopOwners(rows.map((item) => ({
    id: item.id,
    name: item.name,
    bio: item.bio,
    maps_url: item.maps_url,
    city: item.city ?? null,
    neighborhood: item.neighborhood ?? null,
    average_rating: Number(item.average_rating ?? 0),
    rating_count: item.rating_count ?? 0,
    owner_name: item.owner_name,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    distance_km: item.distance_km ?? null,
  })));
}

export async function searchNearbyShops(
  latitude: number,
  longitude: number,
  query = '',
  page = 0,
  radiusKm = 25,
): Promise<readonly ShopSummary[]> {
  const { data, error } = await supabase.rpc('search_nearby_shops', {
    origin_latitude: latitude,
    origin_longitude: longitude,
    search_query: query,
    radius_km: radiusKm,
    page_number: page,
  });
  if (error) {
    if (isMissingNearbyShopSearch(error)) {
      const origin = parseGeoPoint(latitude, longitude);
      if (origin) return searchNearbyPublicRows(origin, query, page, radiusKm);
    }
    throw toAppError(error);
  }
  return filterBlockedShopOwners((data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    bio: item.bio,
    maps_url: item.maps_url,
    city: item.city ?? null,
    neighborhood: item.neighborhood ?? null,
    average_rating: Number(item.average_rating ?? 0),
    rating_count: item.rating_count ?? 0,
    owner_name: item.owner_name,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    distance_km: item.distance_km ?? null,
  })));
}

async function filterBlockedShopOwners<T extends { readonly id: string }>(shops: readonly T[]): Promise<readonly T[]> {
  if (!shops.length) return shops;
  const blocked = new Set(await loadBlockedUserIds());
  if (!blocked.size) return shops;
  const { data, error } = await supabase
    .from('shops')
    .select('id,owner_id')
    .in('id', shops.map((shop) => shop.id));
  if (error) throw toAppError(error);
  const hidden = new Set((data ?? []).filter((row) => blocked.has(row.owner_id)).map((row) => row.id));
  return shops.filter((shop) => !hidden.has(shop.id));
}

export async function getShop(shopId: string): Promise<ShopProfile | null> {
  const versioned = await supabase.rpc('get_public_shop_profile_v2', { target_shop_id: shopId });
  let data = versioned.data;
  if (versioned.error) {
    if (!isMissingVersionedShopProfile(versioned.error)) throw toAppError(versioned.error);
    const legacy = await supabase.rpc('get_public_shop_profile', { target_shop_id: shopId });
    if (legacy.error) throw toAppError(legacy.error);
    data = legacy.data as typeof data;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const blocked = new Set(await loadBlockedUserIds());
  const { data: owner, error: ownerError } = await supabase
    .from('shops')
    .select('owner_id')
    .eq('id', shopId)
    .maybeSingle();
  if (ownerError) throw toAppError(ownerError);
  if (!owner || blocked.has(owner.owner_id)) return null;
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    maps_url: row.maps_url,
    city: row.city ?? null,
    neighborhood: row.neighborhood ?? null,
    average_rating: Number(row.average_rating ?? 0),
    rating_count: row.rating_count ?? 0,
    owner_name: row.owner_name,
    owner_id: owner.owner_id,
    barbers: Array.isArray(row.barbers)
      ? row.barbers.flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
          const barber = item as Record<string, unknown>;
          if (typeof barber.id !== 'string' || typeof barber.name !== 'string' || blocked.has(barber.id)) return [];
          return [{
            id: barber.id,
            name: barber.name,
            phone: String(barber.phone ?? ''),
            is_owner: Boolean(barber.is_owner),
          }];
        })
      : [],
  };
}

export async function getShopOwnerId(shopId: string): Promise<string | null> {
  const { data, error } = await supabase.from('shops').select('owner_id').eq('id', shopId).maybeSingle();
  if (error) throw toAppError(error);
  return data?.owner_id ?? null;
}

export async function removeShopMember(membershipId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_shop_member', {
    target_membership_id: membershipId,
  });
  if (error) throw toAppError(error);
}

export async function loadOwnerBarberWorkspace(
  barberId: string,
): Promise<BarberScheduleWorkspaceDraft | null> {
  const { data, error } = await supabase.rpc('shop_owner_barber_workspace', {
    target_barber_id: barberId,
  });
  if (error) throw toAppError(error);
  return mapOwnerWorkspacePayload((data ?? null) as never);
}

export async function saveOwnerBarberWorkspace(
  barberId: string,
  workspace: BarberScheduleWorkspaceDraft,
): Promise<void> {
  const { error } = await supabase.rpc('shop_owner_replace_barber_workspace', {
    target_barber_id: barberId,
    workspace: toWorkspaceRpcPayload(workspace) as never,
  });
  if (error) throw toAppError(error);
}

export async function getShopActivity(shopId: string) {
  const { data, error } = await supabase.rpc('shop_activity_history', { target_shop_id: shopId });
  if (error) throw toAppError(error);
  return (data ?? []).map((item) => ({
    id: item.id,
    action: item.action,
    actorName: item.actor_name,
    affectedBarberName: item.affected_barber_name,
    createdAt: item.created_at,
  }));
}

export {
  loadOwnerManagedSettings,
  saveOwnerManagedSettings,
  SEARCH_PAGE_SIZE,
};
