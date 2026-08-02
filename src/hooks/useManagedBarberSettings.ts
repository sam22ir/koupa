import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { emptyBarberSettingsDraft } from '@/src/barberSettings';
import {
  cloneWorkspaceDraft,
  isWorkspaceDirty,
  validateWorkspace,
  type BarberScheduleWorkspaceDraft,
  type WorkspaceValidationErrors,
} from '@/src/features/barber-schedule/model';
import * as shopsService from '@/src/services/shops';
import { errorCode } from '@/src/services/errors';

export interface UseManagedBarberSettingsProps {
  readonly barberId?: string;
  readonly ownerId?: string;
}

const emptyWorkspace: BarberScheduleWorkspaceDraft = {
  settings: emptyBarberSettingsDraft,
  exceptions: [],
};

export function useManagedBarberSettings({
  barberId,
  ownerId,
}: UseManagedBarberSettingsProps) {
  const mounted = useRef(true);
  const [loaded, setLoaded] = useState<BarberScheduleWorkspaceDraft | null>(null);
  const [draft, setDraft] = useState<BarberScheduleWorkspaceDraft>(() =>
    cloneWorkspaceDraft(emptyWorkspace),
  );
  const [loading, setLoading] = useState(Boolean(barberId && ownerId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<WorkspaceValidationErrors>({});

  const dirty = useMemo(
    () => (loaded ? isWorkspaceDirty(loaded, draft) : false),
    [draft, loaded],
  );

  const reload = useCallback(async () => {
    if (!barberId || !ownerId) {
      if (mounted.current) {
        setLoaded(null);
        setDraft(cloneWorkspaceDraft(emptyWorkspace));
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError('');
    try {
      const workspace = await shopsService.loadOwnerBarberWorkspace(barberId);
      if (!mounted.current) return;
      if (workspace) {
        setLoaded(cloneWorkspaceDraft(workspace));
        setDraft(cloneWorkspaceDraft(workspace));
      }
      setErrors({});
    } catch {
      if (mounted.current) setError('failed');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [barberId, ownerId]);

  useEffect(() => {
    mounted.current = true;
    const timeout = setTimeout(() => void reload(), 0);
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
    };
  }, [reload]);

  const save = useCallback(async () => {
    if (!barberId || !ownerId) return false;
    const validation = validateWorkspace(draft);
    setErrors(validation);
    if (Object.keys(validation).length) {
      setMessage('');
      return false;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await shopsService.saveOwnerBarberWorkspace(barberId, draft);
      await reload();
      setMessage('saved');
      return true;
    } catch (caught) {
      const code = errorCode(caught);
      setError(
        code === 'INVALID_TIME'
          ? 'invalidTime'
          : code === 'VALIDATION'
            ? 'validation'
            : 'failed',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [barberId, draft, ownerId, reload]);

  const reset = useCallback(() => {
    if (!loaded) return;
    setDraft(cloneWorkspaceDraft(loaded));
    setErrors({});
    setError('');
    setMessage('');
  }, [loaded]);

  return {
    loaded,
    draft,
    setDraft,
    dirty,
    errors,
    loading,
    saving,
    error,
    message,
    save,
    reset,
    reload,
    clearMessage: () => setMessage(''),
  };
}
