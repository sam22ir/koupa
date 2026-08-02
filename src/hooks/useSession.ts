import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingRole, type UserRole } from '@/src/auth';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { useLegalAcceptance } from '@/src/hooks/useLegalAcceptance';
import * as authService from '@/src/services/auth';
import type { ConfirmationType } from '@/src/services/auth';
import type { LegalDocument } from '@/src/services/legal';
import * as profileService from '@/src/services/profile';
import type { Profile } from '@/src/services/profile';
import {
  clearUserScopedCaches,
  profileCache,
  sessionCache,
  setSessionCache,
} from '@/src/services/sessionCache';

export type { Profile, LegalDocument };
export interface UseSessionProps {}

type BootstrapState = readonly [Session | null, UserRole | null, string, ConfirmationType];

let bootstrapPromise: Promise<BootstrapState> | null = null;

function loadBootstrap(): Promise<BootstrapState> {
  if (!bootstrapPromise) {
    const request = Promise.all([
      authService.getSession(),
      authService.loadPendingRoleStorage(),
      authService.loadPendingEmailConfirmationStorage(),
    ]).then(([current, storedRole, confirmation]) => {
      setSessionCache(current);
      const authEmail = current?.user.email?.trim() ?? '';
      const phoneRecoveryPending = Boolean(
        current?.user.phone
        && authEmail
        && !current.user.email_confirmed_at,
      );
      return [
        current,
        storedRole,
        authEmail || confirmation.email,
        phoneRecoveryPending ? 'email_change' : confirmation.type,
      ] as const;
    });
    bootstrapPromise = request.catch((error) => {
      // A rejected singleton must not poison every later retry.
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

export function useSession(_: UseSessionProps = {}) {
  const initialSession = sessionCache ?? null;
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<Profile | null>(() =>
    initialSession ? profileCache.get(initialSession.user.id) ?? null : null,
  );
  const [loading, setLoading] = useState(
    () => sessionCache === undefined || (initialSession !== null && !profileCache.has(initialSession.user.id)),
  );
  const [pendingRole, setPendingRoleState] = useState<UserRole | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [pendingConfirmationType, setPendingConfirmationType] = useState<ConfirmationType>('signup');
  const [bootstrapError, setBootstrapError] = useState<unknown>(null);
  const [profileError, setProfileError] = useState<unknown>(null);
  const currentUserIdRef = useRef<string | null>(initialSession?.user.id ?? null);
  const generationRef = useRef(0);

  const {
    legalAccepted,
    legalConsentRequired,
    legalDocuments,
    legalError,
    acceptCurrentLegalDocuments,
    syncLegal,
    resetLegal,
  } = useLegalAcceptance();

  const loadProfile = useCallback(async (userId: string, force = false) => {
    if (!force && profileCache.has(userId)) {
      const cached = profileCache.get(userId) ?? null;
      if (currentUserIdRef.current === userId) setProfile(cached);
      return cached;
    }
    try {
      const nextProfile = await profileService.loadProfile(userId);
      if (currentUserIdRef.current === userId) {
        profileCache.set(userId, nextProfile);
        setProfile(nextProfile);
        setProfileError(null);
      }
      return nextProfile;
    } catch (caught) {
      if (currentUserIdRef.current === userId) setProfileError(caught);
      throw caught;
    }
  }, []);

  const syncUser = useCallback(async (user: User | null) => {
    currentUserIdRef.current = user?.id ?? null;
    if (!user) {
      setProfile(null);
      setProfileError(null);
      setPendingRoleState(null);
      resetLegal();
      return;
    }
    const nextProfile = await loadProfile(user.id);
    if (currentUserIdRef.current !== user.id) return;
    // A persisted profile role is authoritative. Never leave a provisional
    // local role around to affect a returning account or a later OAuth flow.
    if (nextProfile) setPendingRoleState(null);
    const metadataRole = await syncLegal(user, { canPersistSignupConsent: nextProfile === null });
    if (currentUserIdRef.current === user.id && !nextProfile && metadataRole) {
      setPendingRoleState((current) => (current === metadataRole ? current : metadataRole));
    }
  }, [loadProfile, resetLegal, syncLegal]);

  const syncUserRef = useRef(syncUser);
  useEffect(() => {
    syncUserRef.current = syncUser;
  }, [syncUser]);

  const onPendingConfirmation = useCallback((email: string, type: ConfirmationType) => {
    setPendingConfirmationEmail(email);
    setPendingConfirmationType(type);
  }, []);

  const onSignedOut = useCallback(() => {
    generationRef.current += 1;
    currentUserIdRef.current = null;
    setProfile(null);
    setProfileError(null);
    resetLegal();
    bootstrapPromise = null;
  }, [resetLegal]);

  const auth = useAuthActions({
    hasSession: Boolean(session),
    pendingConfirmationType,
    onPendingRole: setPendingRoleState,
    onPendingConfirmation,
    onSignedOut,
  });

  // Subscribe once — never re-bind when syncUser identity changes.
  useEffect(() => {
    let active = true;
    const bootstrapGeneration = generationRef.current;
    void loadBootstrap()
      .then(async ([current, storedRole, storedEmail, storedType]) => {
        if (!active || generationRef.current !== bootstrapGeneration) return;
        setBootstrapError(null);
        setSession(current);
        currentUserIdRef.current = current?.user.id ?? null;
        setPendingRoleState(storedRole ?? getPendingRole(current?.user ?? null));
        setPendingConfirmationEmail(storedEmail);
        setPendingConfirmationType(storedType);
        await syncUserRef.current(current?.user ?? null);
        if (active) setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setBootstrapError(caught);
        setLoading(false);
      });

    const { data: subscription } = authService.onAuthStateChange((next) => {
      generationRef.current += 1;
      const eventGeneration = generationRef.current;
      currentUserIdRef.current = next?.user.id ?? null;
      setSessionCache(next);
      if (!next) clearUserScopedCaches();
      setBootstrapError(null);
      setProfileError(null);
      setSession((prev) => {
        const prevId = prev?.user.id;
        const nextId = next?.user.id;
        const prevToken = prev?.access_token;
        const nextToken = next?.access_token;
        if (prevId === nextId && prevToken === nextToken) return prev;
        return next;
      });
      // Avoid loading flicker on token refresh for the same user.
      if (next && profileCache.has(next.user.id)) {
        setLoading(false);
      } else if (next) {
        setLoading(true);
      } else {
        setLoading(false);
      }
      void syncUserRef.current(next?.user ?? null)
        .then(() => {
          if (generationRef.current !== eventGeneration) return;
        })
        .catch(() => undefined)
        .finally(() => {
          if (active && generationRef.current === eventGeneration) setLoading(false);
        });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const retrySession = useCallback(async () => {
    generationRef.current += 1;
    const retryGeneration = generationRef.current;
    setBootstrapError(null);
    setProfileError(null);
    setLoading(true);
    bootstrapPromise = null;
    try {
      const [current, storedRole, storedEmail, storedType] = await loadBootstrap();
      if (generationRef.current !== retryGeneration) return;
      setSession(current);
      currentUserIdRef.current = current?.user.id ?? null;
      setPendingRoleState(storedRole ?? getPendingRole(current?.user ?? null));
      setPendingConfirmationEmail(storedEmail);
      setPendingConfirmationType(storedType);
      await syncUser(current?.user ?? null);
    } catch (caught) {
      setBootstrapError(caught);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [syncUser]);

  const emailConfirmed = Boolean(session?.user.email_confirmed_at);
  return {
    session,
    profile,
    loading,
    bootstrapError,
    profileError,
    pendingRole,
    legalAccepted,
    legalConsentRequired,
    legalDocuments,
    legalError,
    emailConfirmed,
    pendingConfirmationEmail,
    acceptCurrentLegalDocuments: () => (
      session ? acceptCurrentLegalDocuments(session.user.id) : Promise.resolve()
    ),
    retryLegalAcceptance: () => (
      session ? acceptCurrentLegalDocuments(session.user.id) : Promise.resolve()
    ),
    refreshProfile: () => {
      if (!session) return Promise.resolve();
      profileCache.delete(session.user.id);
      return loadProfile(session.user.id, true);
    },
    retrySession,
    busy: auth.busy,
    signInWithGoogle: auth.signInWithGoogle,
    linkGoogleIdentity: auth.linkGoogleIdentity,
    signUpWithPassword: auth.signUpWithPassword,
    signInWithPassword: auth.signInWithPassword,
    requestPasswordReset: auth.requestPasswordReset,
    updatePassword: auth.updatePassword,
    resendEmailConfirmation: auth.resendEmailConfirmation,
    completeAuthCallback: auth.completeAuthCallback,
    setPendingRole: auth.setPendingRole,
    clearPendingRole: auth.clearPendingRole,
    signOut: auth.signOut,
  };
}

export { useAuthActions } from '@/src/hooks/useAuthActions';
export { useLegalAcceptance } from '@/src/hooks/useLegalAcceptance';
