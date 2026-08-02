import { useCallback, useEffect, useRef, useState } from 'react';
import type { BarberSettingsDraft } from '@/src/barberSettings';
import type {
  BarberShopState,
  ShopBarberCandidate,
  ShopDraft,
  ShopProfile,
  ShopSummary,
} from '@/src/shops';
import { classifyShopRelationship, emptyShopDraft } from '@/src/shops';
import * as shopsService from '@/src/services/shops';
import { errorCode } from '@/src/services/errors';

function toUiError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'LOCATION_REQUIRED') return 'locationRequired';
  if (code === 'VALIDATION') return 'validation';
  if (code === 'INVITATION_NOT_ALLOWED') return 'invitationNotAllowed';
  return 'failed';
}

export function useShops(userId?: string) {
  const [state, setState] = useState<BarberShopState>({
    ownedShop: null,
    membership: null,
    relationship: { kind: 'none' },
    pendingRequests: [],
    members: [],
  });
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeRef = useRef(true);

  useEffect(() => () => {
    activeRef.current = false;
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await shopsService.loadBarberShopState(userId);
      if (activeRef.current) setState(next);
    } catch {
      if (activeRef.current) setError('failed');
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const createShop = useCallback(async (draft: ShopDraft) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await shopsService.createShop(draft);
      setMessage('created');
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const requestJoin = useCallback(async (shopId: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await shopsService.requestJoinShop(shopId);
      setMessage('requested');
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const respond = useCallback(async (membershipId: string, accept: boolean) => {
    setSaving(true);
    setError('');
    try {
      await shopsService.respondShopMembership(membershipId, accept);
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const respondInvitation = useCallback(async (membershipId: string, accept: boolean) => {
    setSaving(true);
    setError('');
    try {
      await shopsService.respondShopInvitation(membershipId, accept);
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const searchBarbers = useCallback(async (query: string, page = 0): Promise<readonly ShopBarberCandidate[] | null> => {
    setError('');
    try {
      const candidates = await shopsService.searchShopBarberCandidates(query, page);
      return candidates.filter((candidate) => candidate.id !== userId);
    } catch (caught) {
      setError(toUiError(caught));
      return null;
    }
  }, [userId]);

  const inviteBarber = useCallback(async (barberId: string) => {
    setSaving(true);
    setError('');
    try {
      let currentState = state;
      if (!currentState.ownedShop && userId) {
        currentState = await shopsService.loadBarberShopState(userId);
        setState(currentState);
      }

      const ownedShop = currentState.ownedShop;
      if (!ownedShop) {
        setError('failed');
        return false;
      }

      await shopsService.inviteBarberToShop(ownedShop.id, barberId);
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load, state, userId]);

  const getManagedSettings = useCallback(async (barberId: string): Promise<BarberSettingsDraft | null> => {
    try {
      return await shopsService.loadOwnerManagedSettings(barberId);
    } catch (caught) {
      setError(toUiError(caught));
      return null;
    }
  }, []);

  const saveManagedSettings = useCallback(async (barberId: string, settings: BarberSettingsDraft) => {
    setSaving(true);
    setError('');
    try {
      await shopsService.saveOwnerManagedSettings(barberId, settings);
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const leave = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await shopsService.leaveShop();
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const removeShop = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await shopsService.deleteOwnedShop();
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const removeMember = useCallback(async (membershipId: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await shopsService.removeShopMember(membershipId);
      setMessage('removed');
      await load();
      return true;
    } catch (caught) {
      setError(toUiError(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [load]);

  const searchShops = useCallback(async (query: string, page = 0): Promise<readonly ShopSummary[] | null> => {
    setError('');
    try {
      return await shopsService.searchShops(query, page);
    } catch (caught) {
      setError(toUiError(caught));
      return null;
    }
  }, []);

  const getShop = useCallback(async (shopId: string): Promise<ShopProfile | null> => {
    try {
      return await shopsService.getShop(shopId);
    } catch (caught) {
      setError(toUiError(caught));
      return null;
    }
  }, []);

  const getActivity = useCallback(async (shopId: string) => {
    try {
      return await shopsService.getShopActivity(shopId);
    } catch (caught) {
      setError(toUiError(caught));
      return null;
    }
  }, []);

  return {
    state,
    relationship: state.relationship ?? classifyShopRelationship(state.ownedShop, state.membership),
    ownedShop: state.ownedShop,
    membership: state.membership,
    pendingInvitation:
      state.relationship.kind === 'invitation' ? state.relationship.membership : null,
    pendingRequest:
      state.relationship.kind === 'request' ? state.relationship.membership : null,
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
    removeMember,
    searchShops,
    getShop,
    getActivity,
    retry: load,
    clearMessage: () => setMessage(''),
  };
}
