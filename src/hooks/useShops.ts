import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  BarberShopState,
  ShopBarberCandidate,
  ShopDraft,
  ShopMembership,
  ShopProfile,
  ShopSummary,
} from '@/src/shops';
import type { BarberSettingsDraft } from '@/src/barberSettings';
import { emptyShopDraft, validateShopDraft } from '@/src/shops';

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : '';
  if (message.includes('location is required')) return 'locationRequired';
  if (message.includes('cannot be created') || message.includes('cannot be submitted') || message.includes('cannot be updated') || message.includes('cannot be left') || message.includes('cannot be deleted')) {
    return 'failed';
  }
  return 'failed';
}

export function useShops(userId?: string) {
  const [state, setState] = useState<BarberShopState>({ ownedShop: null, membership: null, pendingRequests: [], members: [] });
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [ownedResult, membershipResult] = await Promise.all([
        supabase.from('shops').select('id,name,bio,maps_url,average_rating,rating_count,owner_id').eq('owner_id', userId).maybeSingle(),
        supabase
          .from('shop_memberships')
          .select('id,shop_id,barber_id,status,invited_by,invitation_expires_at,shops(name)')
          .eq('barber_id', userId)
          .in('status', ['pending', 'active'])
          .maybeSingle(),
      ]);
      if (ownedResult.error) throw ownedResult.error;
      if (membershipResult.error) throw membershipResult.error;

      const ownedShop = ownedResult.data;
      let members: ShopMembership[] = [];
      if (ownedShop) {
        const membersResult = await supabase.rpc('shop_owner_members', { target_shop_id: ownedShop.id });
        if (membersResult.error) throw membersResult.error;
        members = (membersResult.data ?? []).map((item: any) => ({
          id: item.id,
          shop_id: ownedShop.id,
          barber_id: item.barber_id,
          status: item.status,
          barber_name: item.barber_name,
          barber_phone: item.barber_phone,
          invited_by: item.invited_by,
          invitation_expires_at: item.invitation_expires_at,
        }));
      }

      setState({
        ownedShop: ownedResult.data
          ? {
              id: ownedResult.data.id,
              name: ownedResult.data.name,
              bio: ownedResult.data.bio,
              maps_url: ownedResult.data.maps_url,
              average_rating: Number(ownedResult.data.average_rating ?? 0),
              rating_count: ownedResult.data.rating_count ?? 0,
              owner_name: '',
            }
          : null,
        membership: membershipResult.data
          ? {
              id: membershipResult.data.id,
              shop_id: membershipResult.data.shop_id,
              barber_id: membershipResult.data.barber_id,
              status: membershipResult.data.status,
              shop_name: (membershipResult.data as any).shops?.name,
              invited_by: (membershipResult.data as any).invited_by,
              invitation_expires_at: (membershipResult.data as any).invitation_expires_at,
            }
          : null,
        pendingRequests: members.filter((member) => member.status === 'pending' && !member.invited_by),
        members,
      });
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createShop = useCallback(
    async (draft: ShopDraft) => {
      const validation = validateShopDraft(draft);
      if (validation) {
        setError(validation);
        return false;
      }
      setSaving(true);
      setError('');
      setMessage('');
      try {
        const { error: requestError } = await supabase.rpc('create_shop', {
          shop_name: draft.name.trim(),
          shop_bio: draft.bio.trim() || null,
          shop_maps_url: draft.mapsUrl.trim() || null,
          shop_latitude: draft.latitude.trim() ? Number(draft.latitude) : null,
          shop_longitude: draft.longitude.trim() ? Number(draft.longitude) : null,
        });
        if (requestError) throw requestError;
        setMessage('created');
        await load();
        return true;
      } catch (caught) {
        setError(errorCode(caught));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const requestJoin = useCallback(
    async (shopId: string) => {
      setSaving(true);
      setError('');
      setMessage('');
      try {
        const { error: requestError } = await supabase.rpc('request_join_shop', { target_shop_id: shopId });
        if (requestError) throw requestError;
        setMessage('requested');
        await load();
        return true;
      } catch (caught) {
        setError(errorCode(caught));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const respond = useCallback(
    async (membershipId: string, accept: boolean) => {
      setSaving(true);
      setError('');
      try {
        const { error: requestError } = await supabase.rpc('respond_shop_membership', {
          target_membership_id: membershipId,
          accept,
        });
        if (requestError) throw requestError;
        await load();
        return true;
      } catch (caught) {
        setError(errorCode(caught));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const respondInvitation = useCallback(
    async (membershipId: string, accept: boolean) => {
      setSaving(true);
      setError('');
      try {
        const { error: requestError } = await supabase.rpc('respond_shop_invitation', {
          target_membership_id: membershipId,
          accept,
        });
        if (requestError) throw requestError;
        await load();
        return true;
      } catch (caught) {
        setError(errorCode(caught));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const searchBarbers = useCallback(async (query: string): Promise<readonly ShopBarberCandidate[] | null> => {
    const { data, error: requestError } = await supabase.rpc('search_published_barbers', {
      search_query: query,
      city_query: '',
      page_number: 0,
    });
    if (requestError) {
      setError(errorCode(requestError));
      return null;
    }
    return (data ?? []).map((item: any) => ({ id: item.id, name: item.name, city: item.city, neighborhood: item.neighborhood }));
  }, []);

  const inviteBarber = useCallback(async (barberId: string) => {
    if (!state.ownedShop) return false;
    setSaving(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('invite_barber_to_shop', {
        target_shop_id: state.ownedShop.id,
        target_barber_id: barberId,
      });
      if (requestError) throw requestError;
      await load();
      return true;
    } catch (caught) {
      setError(errorCode(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load, state.ownedShop]);

  const getManagedSettings = useCallback(async (barberId: string): Promise<BarberSettingsDraft | null> => {
    const { data, error: requestError } = await supabase.rpc('shop_owner_barber_settings', { target_barber_id: barberId });
    if (requestError) {
      setError(errorCode(requestError));
      return null;
    }
    if (!data) return null;
    const schedules = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const row = (data.schedules ?? []).find((item: any) => Number(item.day_of_week) === dayOfWeek);
      return row
        ? { dayOfWeek, enabled: true, startsAt: row.starts_at, endsAt: row.ends_at, breaks: (row.breaks ?? []).map((item: any) => ({ startsAt: item.starts_at, endsAt: item.ends_at })) }
        : { dayOfWeek, enabled: false, startsAt: '09:00', endsAt: '18:00', breaks: [] };
    });
    return {
      isBookingPaused: Boolean(data.is_booking_paused),
      bookingWindowDays: String(data.booking_window_days ?? 7),
      minimumNoticeMinutes: Number(data.minimum_notice_minutes ?? 0),
      intervalMinutes: Number(data.interval_minutes ?? 30),
      schedules,
      services: (data.services ?? []).map((item: any) => ({ id: item.id, name: item.name, priceDzd: String(item.price_dzd), durationMinutes: String(item.duration_minutes), isActive: true })),
    };
  }, []);

  const saveManagedSettings = useCallback(async (barberId: string, settings: BarberSettingsDraft) => {
    setSaving(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('shop_owner_update_barber_settings', {
        target_barber_id: barberId,
        settings: {
          is_booking_paused: settings.isBookingPaused,
          booking_window_days: Number(settings.bookingWindowDays),
          minimum_notice_minutes: settings.minimumNoticeMinutes,
          interval_minutes: settings.intervalMinutes,
          services: settings.services.filter((service) => service.isActive !== false).map((service) => ({ id: service.id ?? null, name: service.name, price_dzd: Number(service.priceDzd), duration_minutes: Number(service.durationMinutes) })),
          schedules: settings.schedules.map((schedule) => ({ day_of_week: schedule.dayOfWeek, enabled: schedule.enabled, starts_at: schedule.startsAt, ends_at: schedule.endsAt, breaks: schedule.breaks.map((item) => ({ starts_at: item.startsAt, ends_at: item.endsAt })) })),
        },
      });
      if (requestError) throw requestError;
      return true;
    } catch (caught) {
      setError(errorCode(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const leave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('leave_shop');
      if (requestError) throw requestError;
      await load();
      return true;
    } catch (caught) {
      setError(errorCode(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const removeShop = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const { error: requestError } = await supabase.rpc('delete_owned_shop');
      if (requestError) throw requestError;
      await load();
      return true;
    } catch (caught) {
      setError(errorCode(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const searchShops = useCallback(async (query: string): Promise<readonly ShopSummary[] | null> => {
    const { data, error: requestError } = await supabase.rpc('search_published_shops', {
      search_query: query,
      page_number: 0,
    });
    if (requestError) {
      setError(errorCode(requestError));
      return null;
    }
    return (data ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      bio: item.bio,
      maps_url: item.maps_url,
      average_rating: Number(item.average_rating ?? 0),
      rating_count: item.rating_count ?? 0,
      owner_name: item.owner_name,
    }));
  }, []);

  const getShop = useCallback(async (shopId: string): Promise<ShopProfile | null> => {
    const { data, error: requestError } = await supabase.rpc('get_public_shop_profile', { target_shop_id: shopId });
    if (requestError) {
      setError(errorCode(requestError));
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      maps_url: row.maps_url,
      average_rating: Number(row.average_rating ?? 0),
      rating_count: row.rating_count ?? 0,
      owner_name: row.owner_name,
      barbers: Array.isArray(row.barbers) ? row.barbers : [],
    };
  }, []);

  return {
    state,
    draftDefaults: emptyShopDraft,
    loading,
    saving,
    error,
    message,
    load,
    createShop,
    requestJoin,
    respond,
    respondInvitation,
    searchBarbers,
    inviteBarber,
    getManagedSettings,
    saveManagedSettings,
    leave,
    removeShop,
    searchShops,
    getShop,
  };
}
