import { useCallback, useState } from 'react';
import type { UserRole } from '@/src/auth';
import { isGoogleCollisionMessage } from '@/src/auth';
import * as authService from '@/src/services/auth';
import type { AuthCallbackResult, ConfirmationType } from '@/src/services/auth';
import { clearSessionCaches } from '@/src/services/sessionCache';
import { clearPendingIntent } from '@/src/navigation/pendingIntent';

export interface UseAuthActionsProps {
  readonly hasSession?: boolean;
  readonly pendingConfirmationType: ConfirmationType;
  readonly onPendingRole: (role: UserRole | null) => void;
  readonly onPendingConfirmation: (email: string, type: ConfirmationType) => void;
  readonly onSignedOut: () => void;
}

export function useAuthActions({
  hasSession: _hasSession,
  pendingConfirmationType,
  onPendingRole,
  onPendingConfirmation,
  onSignedOut,
}: UseAuthActionsProps) {
  const [busy, setBusy] = useState(false);

  const setPendingRole = useCallback(async (role: UserRole) => {
    await authService.setPendingRoleStorage(role);
    onPendingRole(role);
  }, [onPendingRole]);

  const clearPendingRole = useCallback(async () => {
    await authService.clearPendingRoleStorage();
    onPendingRole(null);
  }, [onPendingRole]);

  const completeAuthCallback = useCallback(async (url: string, role?: UserRole): Promise<AuthCallbackResult> => {
    try {
      const result = await authService.completeAuthCallback(url, role);
      if (result.kind === 'session' || result.kind === 'recovery') {
        onPendingConfirmation('', 'signup');
      }
      if (result.kind === 'recovery') {
        await authService.clearPendingRoleStorage();
        onPendingRole(null);
      }
      return result;
    } catch (error) {
      const causeMessage = error instanceof Error && 'cause' in error && error.cause instanceof Error
        ? error.cause.message
        : '';
      const message = error instanceof Error ? error.message : String(error ?? '');
      if (isGoogleCollisionMessage(message) || isGoogleCollisionMessage(causeMessage)) {
        clearSessionCaches();
        onSignedOut();
      }
      throw error;
    }
  }, [onPendingConfirmation, onPendingRole, onSignedOut]);

  const signInWithGoogle = useCallback(async (role?: UserRole): Promise<AuthCallbackResult> => {
    setBusy(true);
    try {
      if (role) await setPendingRole(role);
      else {
        await authService.clearPendingRoleStorage();
        onPendingRole(null);
      }
      const result = await authService.signInWithGoogle(role);
      if (result.kind === 'empty') {
        await authService.clearPendingRoleStorage();
        onPendingRole(null);
      }
      return result;
    } finally {
      setBusy(false);
    }
  }, [onPendingRole, setPendingRole]);

  const linkGoogleIdentity = useCallback(async (): Promise<AuthCallbackResult> => {
    setBusy(true);
    try {
      return await authService.linkGoogleIdentity();
    } finally {
      setBusy(false);
    }
  }, []);

  const signUpWithPassword = useCallback(async (input: {
    readonly email: string;
    readonly phone: string;
    readonly password: string;
    readonly role: UserRole;
  }) => {
    setBusy(true);
    try {
      const type = await authService.signUpWithPassword(input);
      onPendingConfirmation(input.email, type);
      return type;
    } finally {
      setBusy(false);
    }
  }, [onPendingConfirmation]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setBusy(true);
    try {
      // A normal sign-in must not inherit a role selected for an abandoned
      // signup attempt. Auth metadata is re-read after the session arrives.
      await authService.clearPendingRoleStorage();
      onPendingRole(null);
      const session = await authService.signInWithPassword(email, password);
      const confirmationEmail = session.user.email?.trim();
      if (!session.user.email_confirmed_at && confirmationEmail) {
        onPendingConfirmation(confirmationEmail, 'signup');
      }
      return session;
    } finally {
      setBusy(false);
    }
  }, [onPendingConfirmation, onPendingRole]);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    setBusy(true);
    try {
      await authService.clearPendingRoleStorage();
      onPendingRole(null);
      const session = await authService.signInWithPhone(phone, password);
      const confirmationEmail = session.user.email?.trim();
      if (!session.user.email_confirmed_at && confirmationEmail) {
        onPendingConfirmation(confirmationEmail, 'signup');
      }
      return session;
    } finally {
      setBusy(false);
    }
  }, [onPendingConfirmation, onPendingRole]);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authService.requestPasswordReset(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setBusy(true);
    try {
      await authService.updatePassword(password);
    } finally {
      setBusy(false);
    }
  }, []);

  const resendEmailConfirmation = useCallback(async (email: string) => {
    await authService.resendEmailConfirmation(email, pendingConfirmationType);
    onPendingConfirmation(email.trim(), pendingConfirmationType);
  }, [onPendingConfirmation, pendingConfirmationType]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    clearSessionCaches();
    await Promise.all([
      authService.clearPendingRoleStorage(),
      authService.clearPendingEmailConfirmationStorage(),
    ]);
    onPendingRole(null);
    onPendingConfirmation('', 'signup');
    clearPendingIntent();
    onSignedOut();
  }, [onPendingConfirmation, onPendingRole, onSignedOut]);

  return {
    busy,
    setPendingRole,
    clearPendingRole,
    completeAuthCallback,
    signInWithGoogle,
    linkGoogleIdentity,
    signUpWithPassword,
    signInWithPassword,
    signInWithPhone,
    requestPasswordReset,
    updatePassword,
    resendEmailConfirmation,
    signOut,
  };
}
