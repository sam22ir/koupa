import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultBarberDraft, type BarberDraft } from '@/src/data/onboarding';
import * as onboardingService from '@/src/services/onboarding';

export interface UseOnboardingProps {
  readonly userId?: string;
  readonly initialPhone?: string;
  readonly initialName?: string;
}

export function useOnboarding({ userId, initialPhone, initialName }: UseOnboardingProps) {
  const [draft, setDraft] = useState<BarberDraft>(() => ({
    ...defaultBarberDraft,
    phone: initialPhone ?? '',
    name: initialName ?? '',
  }));
  const [draftStep, setDraftStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(Boolean(userId));
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [retryToken, setRetryToken] = useState(0);
  const hydratedUserRef = useRef<string | null>(null);
  const lastSaveRef = useRef<{ step: number; draft: BarberDraft } | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      hydratedUserRef.current = null;
      const timeout = setTimeout(() => setHydrating(false), 0);
      return () => {
        active = false;
        clearTimeout(timeout);
      };
    }

    const timeout = setTimeout(() => {
      setLoadError(null);
      setHydrating(true);
      void (async () => {
        try {
          const loaded = await onboardingService.loadOnboardingDraft(userId);
          if (!active) return;
          if (loaded.draft) {
            setDraft({
              ...defaultBarberDraft,
              phone: initialPhone ?? '',
              ...loaded.draft,
              // A saved draft with no name yet should still start from the signup name.
              name: loaded.draft.name || initialName || '',
            });
          }
          setDraftStep(loaded.step);
          hydratedUserRef.current = userId;
        } catch (caught) {
          if (active) setLoadError(caught);
        } finally {
          if (active) setHydrating(false);
        }
      })();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [initialName, initialPhone, retryToken, userId]);

  const retryLoad = useCallback(async () => {
    setRetryToken((value) => value + 1);
  }, []);

  const saveDraft = useCallback(async (step: number, nextDraft: BarberDraft) => {
    if (!userId) return;
    lastSaveRef.current = { step, draft: nextDraft };
    setSaving(true);
    setSaveError(null);
    try {
      await onboardingService.saveOnboardingDraft(userId, step, nextDraft);
      setDraftStep(step);
    } catch (caught) {
      setSaveError(caught);
      throw caught;
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const retrySave = useCallback(async () => {
    if (!lastSaveRef.current) return;
    await saveDraft(lastSaveRef.current.step, lastSaveRef.current.draft);
  }, [saveDraft]);

  useEffect(() => {
    if (!userId || hydrating || loadError || hydratedUserRef.current !== userId) return;
    const timeout = setTimeout(() => {
      lastSaveRef.current = { step: draftStep, draft };
      void onboardingService.saveOnboardingDraft(userId, draftStep, draft).catch((caught) => {
        setSaveError(caught);
      });
    }, 700);
    return () => clearTimeout(timeout);
  }, [draft, draftStep, hydrating, loadError, userId]);

  const createCustomer = useCallback(async (name: string, phone: string) => {
    if (!userId) throw new Error('No active session');
    await onboardingService.createCustomerProfile(userId, name, phone);
  }, [userId]);

  const createBarber = useCallback(async (nextDraft: BarberDraft) => {
    if (!userId) throw new Error('No active session');
    await onboardingService.createBarberProfile(nextDraft);
  }, [userId]);

  const publishBarber = useCallback(async (nextDraft: BarberDraft) => {
    if (!userId) throw new Error('No active session');
    await onboardingService.publishBarberProfile(nextDraft);
  }, [userId]);

  return {
    draft,
    draftStep,
    setDraft,
    saving,
    hydrating,
    loadError,
    saveError,
    retryLoad,
    retrySave,
    saveDraft,
    createCustomer,
    createBarber,
    publishBarber,
  };
}
