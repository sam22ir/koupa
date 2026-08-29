const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  loadBarberShopState,
  loadOwnerBarberWorkspace,
  mapShopMembershipRow,
  removeShopMember,
  saveOwnerBarberWorkspace,
  getShop,
  searchNearbyShops,
  searchShops,
} from '@/src/services/shops';
import { emptyBarberSettingsDraft } from '@/src/barberSettings';
import type { BarberScheduleWorkspaceDraft } from '@/src/features/barber-schedule/model';

function fromResult(data: unknown, error: unknown = null) {
  type Query = {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    maybeSingle: jest.Mock;
  };
  const query: Query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    maybeSingle: jest.fn(async () => ({ data, error })),
  };
  return query;
}

describe('barber Shop services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps invitation membership state without losing timestamps', () => {
    expect(
      mapShopMembershipRow({
        id: 'membership-1',
        shop_id: 'shop-1',
        barber_id: 'barber-1',
        status: 'pending',
        invited_by: 'owner-1',
        invitation_expires_at: '2026-08-30T08:00:00.000Z',
        created_at: '2026-07-31T08:00:00.000Z',
        updated_at: '2026-07-31T08:00:00.000Z',
        shops: { name: 'محل النور' },
      }),
    ).toMatchObject({ invited_by: 'owner-1', shop_name: 'محل النور' });
  });

  it('maps membership timestamps returned by the owner-members RPC', () => {
    const membership = mapShopMembershipRow({
      id: 'membership-1',
      shop_id: 'shop-1',
      barber_id: 'barber-1',
      status: 'active',
      barber_name: 'عمر',
      barber_phone: null,
      invited_by: null,
      invitation_expires_at: null,
      created_at: '2026-07-20T08:00:00.000Z',
      updated_at: '2026-07-31T08:00:00.000Z',
    });

    expect(membership.created_at).toBe('2026-07-20T08:00:00.000Z');
    expect(membership.updated_at).toBe('2026-07-31T08:00:00.000Z');
  });

  it('loads an invitation relationship for an unaffiliated barber', async () => {
    mockFrom
      .mockReturnValueOnce(fromResult(null))
      .mockReturnValueOnce(
        fromResult({
          id: 'membership-1',
          shop_id: 'shop-1',
          barber_id: 'barber-1',
          status: 'pending',
          invited_by: 'owner-1',
          invitation_expires_at: '2026-08-30T08:00:00.000Z',
          shops: { name: 'محل النور' },
        }),
      );

    await expect(loadBarberShopState('barber-1')).resolves.toMatchObject({
      relationship: { kind: 'invitation' },
      membership: { shop_name: 'محل النور' },
    });
  });

  it('keeps membership timestamps when loading an owner roster', async () => {
    mockFrom
      .mockReturnValueOnce(
        fromResult({
          id: 'shop-1',
          name: 'محل النور',
          bio: null,
          maps_url: null,
          average_rating: 4.5,
          rating_count: 12,
          owner_id: 'owner-1',
        }),
      )
      .mockReturnValueOnce(fromResult(null));
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'membership-1',
          barber_id: 'barber-1',
          barber_name: 'عمر',
          barber_phone: null,
          status: 'active',
          invited_by: null,
          invitation_expires_at: null,
          created_at: '2026-07-20T08:00:00.000Z',
          updated_at: '2026-07-31T08:00:00.000Z',
        },
      ],
      error: null,
    });

    await expect(loadBarberShopState('owner-1')).resolves.toMatchObject({
      members: [
        expect.objectContaining({
          created_at: '2026-07-20T08:00:00.000Z',
          updated_at: '2026-07-31T08:00:00.000Z',
        }),
      ],
    });
  });

  it('searches shops through the versioned location-aware RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'shop-1',
          name: 'Central Barber',
          bio: null,
          maps_url: null,
          city: 'Algiers',
          neighborhood: 'Hydra',
          average_rating: 4.5,
          rating_count: 12,
          owner_name: 'Samir',
        },
      ],
      error: null,
    });

    await expect(searchShops('central')).resolves.toEqual([
      expect.objectContaining({ city: 'Algiers', neighborhood: 'Hydra' }),
    ]);
    expect(mockRpc).toHaveBeenCalledWith('search_published_shops_v2', {
      search_query: 'central',
      page_number: 0,
    });
  });

  it('maps nearby shop distances from the coordinate search RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        id: 'shop-nearby',
        name: 'محل قريب',
        bio: null,
        maps_url: 'https://maps.google.com/?q=36.75,3.05',
        city: 'Algiers',
        neighborhood: 'Hydra',
        average_rating: 4.8,
        rating_count: 5,
        owner_name: 'Samir',
        latitude: 36.75,
        longitude: 3.05,
        distance_km: 1.4,
      }],
      error: null,
    });

    await expect(searchNearbyShops(36.7538, 3.0588, 'nearby')).resolves.toEqual([
      expect.objectContaining({ id: 'shop-nearby', distance_km: 1.4 }),
    ]);
    expect(mockRpc).toHaveBeenCalledWith('search_nearby_shops', {
      origin_latitude: 36.7538,
      origin_longitude: 3.0588,
      search_query: 'nearby',
      radius_km: 25,
      page_number: 0,
    });
  });

  it('falls back to the legacy shop search when the versioned RPC is unavailable', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.search_published_shops_v2(page_number, search_query) in the schema cache',
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'shop-1',
            name: 'Central Barber',
            bio: null,
            maps_url: null,
            average_rating: 4.5,
            rating_count: 12,
            owner_name: 'Samir',
          },
        ],
        error: null,
      });

    await expect(searchShops('central')).resolves.toEqual([
      expect.objectContaining({ city: null, neighborhood: null }),
    ]);
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'search_published_shops', {
      search_query: 'central',
      page_number: 0,
    });
  });

  it('uses coordinate-aware public rows when the nearby RPC is missing from the API cache', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.search_nearby_shops(origin_latitude, origin_longitude, search_query, radius_km, page_number) in the schema cache',
        },
      });

    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({
        data: [{
          id: 'shop-nearby',
          name: 'Central Barber',
          bio: null,
          maps_url: 'https://maps.google.com/?q=36.7525,3.0420',
          latitude: null,
          longitude: null,
          owner: {
            name: 'أمين',
            city: 'الجزائر',
            neighborhood: 'حيدرة',
            role: 'barber',
            is_published: true,
            latitude: null,
            longitude: null,
            maps_url: null,
          },
        }],
        error: null,
      }),
    });

    await expect(searchNearbyShops(36.7538, 3.0588, 'central')).resolves.toEqual([
      expect.objectContaining({ id: 'shop-nearby', distance_km: expect.any(Number) }),
    ]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('search_nearby_shops', {
      origin_latitude: 36.7538,
      origin_longitude: 3.0588,
      search_query: 'central',
      radius_km: 25,
      page_number: 0,
    });
    expect(mockFrom).toHaveBeenCalledWith('shops');
  });

  it('falls back to the legacy shop profile when the versioned RPC is unavailable', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.get_public_shop_profile_v2(target_shop_id) in the schema cache',
        },
      })
      .mockResolvedValueOnce({
        data: [{
          id: 'shop-1',
          name: 'Central Barber',
          bio: null,
          maps_url: null,
          average_rating: 4.5,
          rating_count: 12,
          owner_name: 'Samir',
          barbers: [],
        }],
        error: null,
      });

    await expect(getShop('shop-1')).resolves.toEqual(expect.objectContaining({
      id: 'shop-1',
      name: 'Central Barber',
      city: null,
      neighborhood: null,
      barbers: [],
    }));
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'get_public_shop_profile', {
      target_shop_id: 'shop-1',
    });
  });

  it('removes a member through the owner-only RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await removeShopMember('membership-1');

    expect(mockRpc).toHaveBeenCalledWith('remove_shop_member', {
      target_membership_id: 'membership-1',
    });
  });

  it('loads and saves the owner workspace through owner-specific RPCs', async () => {
    const workspace: BarberScheduleWorkspaceDraft = {
      settings: {
        ...emptyBarberSettingsDraft,
        services: [
          {
            id: 'service-1',
            name: 'حلاقة شعر',
            priceDzd: '800',
            durationMinutes: '30',
            isActive: true,
          },
        ],
      },
      exceptions: [],
    };
    mockRpc
      .mockResolvedValueOnce({
        data: {
          ...workspace.settings,
          services: [{ id: 'service-1', name: 'حلاقة شعر', price_dzd: 800, duration_minutes: 30, is_active: true }],
          schedules: [],
          exceptions: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(loadOwnerBarberWorkspace('barber-2')).resolves.toMatchObject({
      settings: { services: [expect.objectContaining({ id: 'service-1' })] },
    });
    await saveOwnerBarberWorkspace('barber-2', workspace);

    expect(mockRpc).toHaveBeenLastCalledWith('shop_owner_replace_barber_workspace', {
      target_barber_id: 'barber-2',
      workspace: expect.objectContaining({
        services: [expect.objectContaining({ id: 'service-1', is_active: true })],
        exceptions: [],
      }),
    });
  });
});
