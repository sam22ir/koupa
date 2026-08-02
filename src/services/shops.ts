import { supabase } from '@/lib/supabase';
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
};

function isMissingVersionedShopSearch(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return error?.code === 'PGRST202' && error.message?.includes('search_published_shops_v2') === true;
}

function isMissingVersionedShopProfile(error: { readonly code?: string; readonly message?: string } | null): boolean {
  return error?.code === 'PGRST202' && error.message?.includes('get_public_shop_profile_v2') === true;
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
  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    city: item.city,
    neighborhood: item.neighborhood,
  }));
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

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    bio: item.bio,
    maps_url: item.maps_url,
    city: item.city ?? null,
    neighborhood: item.neighborhood ?? null,
    average_rating: Number(item.average_rating ?? 0),
    rating_count: item.rating_count ?? 0,
    owner_name: item.owner_name,
  }));
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
    barbers: Array.isArray(row.barbers)
      ? row.barbers.flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
          const barber = item as Record<string, unknown>;
          if (typeof barber.id !== 'string' || typeof barber.name !== 'string') return [];
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
