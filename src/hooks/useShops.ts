import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  BarberShopState,
  ShopDraft,
  ShopMembership,
  ShopProfile,
  ShopSummary,
} from '@/src/shops';
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
  const [state, setState] = useState<BarberShopState>({ ownedShop: null, membership: null, pendingRequests: [] });
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
          .select('id,shop_id,barber_id,status,shops(name)')
          .eq('barber_id', userId)
          .in('status', ['pending', 'active'])
          .maybeSingle(),
      ]);
      if (ownedResult.error) throw ownedResult.error;
      if (membershipResult.error) throw membershipResult.error;

      let pendingRequests: ShopMembership[] = [];
      if (ownedResult.data) {
        const pendingResult = await supabase
          .from('shop_memberships')
          .select('id,shop_id,barber_id,status,profiles!shop_memberships_barber_id_fkey(name)')
          .eq('shop_id', ownedResult.data.id)
          .eq('status', 'pending');
        if (pendingResult.error) throw pendingResult.error;
        pendingRequests = (pendingResult.data ?? []).map((item: any) => ({
          id: item.id,
          shop_id: item.shop_id,
          barber_id: item.barber_id,
          status: item.status,
          barber_name: item.profiles?.name,
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
            }
          : null,
        pendingRequests,
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
    leave,
    removeShop,
    searchShops,
    getShop,
  };
}
