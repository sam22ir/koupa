import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { t } from '@/src/i18n';

type LeaveGuardOptions = {
  readonly dirty: boolean;
  readonly reset: () => void;
  readonly save: () => Promise<boolean>;
};

/** Protects editable workspaces from both system Back and app-owned leave actions. */
export function useUnsavedWorkspaceLeaveGuard({
  dirty,
  reset,
  save,
}: LeaveGuardOptions) {
  const navigation = useNavigation();
  const allowNextRemoval = useRef(false);

  const proceed = useCallback((leave: () => void) => {
    allowNextRemoval.current = true;
    leave();
  }, []);

  const requestLeave = useCallback((leave: () => void) => {
    if (!dirty) {
      leave();
      return;
    }

    Alert.alert(
      t('scheduleWorkspace.leaveTitle'),
      t('scheduleWorkspace.leaveBody'),
      [
        { text: t('scheduleWorkspace.keepEditing'), style: 'cancel' },
        {
          text: t('scheduleWorkspace.discard'),
          style: 'destructive',
          onPress: () => {
            reset();
            proceed(leave);
          },
        },
        {
          text: t('common.save'),
          onPress: () => {
            void save().then((saved) => {
              if (saved) proceed(leave);
            });
          },
        },
      ],
    );
  }, [dirty, proceed, reset, save]);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (allowNextRemoval.current) {
      allowNextRemoval.current = false;
      return;
    }
    if (!dirty) return;
    event.preventDefault();
    requestLeave(() => navigation.dispatch(event.data.action));
  }), [dirty, navigation, requestLeave]);

  const requestAction = useCallback((action: () => void) => {
    if (!dirty) {
      action();
      return;
    }

    Alert.alert(
      t('scheduleWorkspace.leaveTitle'),
      t('scheduleWorkspace.leaveBody'),
      [
        { text: t('scheduleWorkspace.keepEditing'), style: 'cancel' },
        { text: t('scheduleWorkspace.discard'), style: 'destructive', onPress: () => { reset(); action(); } },
        { text: t('common.save'), onPress: () => { void save().then((saved) => { if (saved) action(); }); } },
      ],
    );
  }, [dirty, reset, save]);

  return { requestLeave, requestAction };
}
