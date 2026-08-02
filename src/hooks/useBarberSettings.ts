import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { emptyBarberSettingsDraft } from '@/src/barberSettings';
import {
  cloneWorkspaceDraft,
  isWorkspaceDirty,
  validateWorkspace,
  type BarberScheduleWorkspaceDraft,
  type WorkspaceValidationErrors,
} from '@/src/features/barber-schedule/model';
import * as barberSettingsService from '@/src/services/barberSettings';
import { errorCode } from '@/src/services/errors';

export interface UseBarberSettingsProps {
  readonly userId?: string;
}

const emptyWorkspace: BarberScheduleWorkspaceDraft = {
  settings: emptyBarberSettingsDraft,
  exceptions: [],
};

export async function loadWorkspaceWhenActive(
  loader: () => Promise<BarberScheduleWorkspaceDraft>,
  isActive: () => boolean,
  onSuccess: (workspace: BarberScheduleWorkspaceDraft) => void,
): Promise<void> {
  const workspace = await loader();
  if (isActive()) onSuccess(workspace);
}

export function useBarberSettings({ userId }: UseBarberSettingsProps) {
  const mounted = useRef(true);
  const [loaded, setLoaded] = useState<BarberScheduleWorkspaceDraft | null>(null);
  const [draft, setDraft] = useState<BarberScheduleWorkspaceDraft>(() =>
    cloneWorkspaceDraft(emptyWorkspace),
  );
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<WorkspaceValidationErrors>({});

  const dirty = useMemo(
    () => (loaded ? isWorkspaceDirty(loaded, draft) : false),
    [draft, loaded],
  );

  const load = useCallback(async (isActive: () => boolean = () => mounted.current) => {
    if (!userId) {
      if (!isActive()) return;
      setLoaded(null);
      setDraft(cloneWorkspaceDraft(emptyWorkspace));
      setLoading(false);
      return;
    }
    if (isActive()) {
      setLoading(true);
      setError('');
    }
    try {
      await loadWorkspaceWhenActive(
        () => barberSettingsService.loadBarberScheduleWorkspace(userId),
        isActive,
        (next) => {
          setLoaded(cloneWorkspaceDraft(next));
          setDraft(cloneWorkspaceDraft(next));
          setErrors({});
        },
      );
    } catch {
      if (isActive()) setError('failed');
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const timeout = setTimeout(() => void load(() => mounted.current && active), 0);
    return () => {
      active = false;
      mounted.current = false;
      clearTimeout(timeout);
    };
  }, [load]);

  const save = useCallback(async () => {
    if (!userId) return false;
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
      await barberSettingsService.saveBarberScheduleWorkspace(draft);
      await load();
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
  }, [draft, load, userId]);

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
    clearMessage: () => setMessage(''),
    save,
    reset,
    reload: load,
  };
}
