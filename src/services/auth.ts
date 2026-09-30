import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { appStorage } from '@/lib/storage';
import {
  hasUnapprovedGoogleCollision,
  isExistingConfirmedEmailSignup,
  normalizeAlgerianPhone,
  parseAuthCallback,
  type UserRole,
} from '@/src/auth';
import { authCallbackUrl } from '@/src/services/authCallbackUrl';
import { AppError, toAppError } from '@/src/services/errors';

export { authCallbackUrl, NATIVE_AUTH_CALLBACK_URL } from '@/src/services/authCallbackUrl';

WebBrowser.maybeCompleteAuthSession();

export type ConfirmationType = 'signup' | 'email_change';

export const pendingRoleKey = 'koupa.pending-role';
export const pendingConfirmationEmailKey = 'koupa.pending-confirmation-email';
export const pendingConfirmationTypeKey = 'koupa.pending-confirmation-type';

function looksLikeAuthCallback(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!(lower.includes('callback') || lower.includes('koupa://') || lower.startsWith('exp://'))) {
    return false;
  }
  const params = parseAuthCallback(url);
  return Boolean(
    params.code
    || params.access_token
    || params.refresh_token
    || params.token_hash
    || params.error
    || params.error_description,
  );
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error, 'UNAUTHORIZED');
  return data.session;
}

export function onAuthStateChange(handler: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    handler(session);
  });
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error, 'UNAUTHORIZED');
}

export async function setPendingRoleStorage(role: UserRole): Promise<void> {
  await appStorage.setItem(pendingRoleKey, role);
}

export async function clearPendingRoleStorage(): Promise<void> {
  await appStorage.removeItem(pendingRoleKey);
}

export async function loadPendingRoleStorage(): Promise<UserRole | null> {
  const value = await appStorage.getItem(pendingRoleKey);
  return value === 'barber' || value === 'customer' ? value : null;
}

export async function setPendingEmailConfirmationStorage(
  email: string,
  type: ConfirmationType,
): Promise<void> {
  await Promise.all([
    appStorage.setItem(pendingConfirmationEmailKey, email),
    appStorage.setItem(pendingConfirmationTypeKey, type),
  ]);
}

export async function clearPendingEmailConfirmationStorage(): Promise<void> {
  await Promise.all([
    appStorage.removeItem(pendingConfirmationEmailKey),
    appStorage.removeItem(pendingConfirmationTypeKey),
  ]);
}

export async function loadPendingEmailConfirmationStorage(): Promise<{
  readonly email: string;
  readonly type: ConfirmationType;
}> {
  const [email, type] = await Promise.all([
    appStorage.getItem(pendingConfirmationEmailKey),
    appStorage.getItem(pendingConfirmationTypeKey),
  ]);
  return {
    email: email ?? '',
    type: type === 'email_change' ? 'email_change' : 'signup',
  };
}

export async function updateUserRole(role: UserRole, withConsent = false): Promise<void> {
  const data = withConsent
    ? { koupa_role: role, koupa_signup_consent: true }
    : { koupa_role: role };
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/email not confirmed/i.test(error.message ?? '')) {
      await setPendingEmailConfirmationStorage(email.trim(), 'signup');
    }
    throw toAppError(error, 'UNAUTHORIZED');
  }
  if (!data.session) throw new AppError('UNAUTHORIZED', new Error('Authentication session is unavailable'));
  const confirmationEmail = data.session.user.email?.trim();
  if (!data.session.user.email_confirmed_at && confirmationEmail) {
    await setPendingEmailConfirmationStorage(confirmationEmail, 'signup');
  }
  return data.session;
}

export async function signInWithPhone(phone: string, password: string): Promise<Session> {
  const normalizedPhone = normalizeAlgerianPhone(phone);
  if (!normalizedPhone) throw new AppError('VALIDATION', new Error('Invalid phone number'));

  const { data, error } = await supabase.functions.invoke('sign-in-with-phone', {
    body: { phone: normalizedPhone, password },
  });
  if (error) throw new AppError('UNAUTHORIZED', new Error('Invalid login credentials'));

  const payload = data as { readonly access_token?: unknown; readonly refresh_token?: unknown } | null;
  if (typeof payload?.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
    throw new AppError('UNAUTHORIZED', new Error('Authentication session is unavailable'));
  }

  const sessionResult = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (sessionResult.error) throw toAppError(sessionResult.error, 'UNAUTHORIZED');
  if (!sessionResult.data.session) {
    throw new AppError('UNAUTHORIZED', new Error('Authentication session is unavailable'));
  }
  return sessionResult.data.session;
}

export async function signUpWithPassword(input: {
  readonly email: string;
  readonly name?: string;
  readonly phone?: string;
  readonly password: string;
  readonly role: UserRole;
}): Promise<ConfirmationType> {
  if (!input.phone) throw new AppError('VALIDATION', new Error('Phone is required'));
  const metadata = {
    koupa_role: input.role,
    koupa_signup_consent: true,
    koupa_phone: input.phone,
    ...(input.name?.trim() ? { koupa_name: input.name.trim() } : {}),
  };
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: authCallbackUrl(), data: metadata },
  });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
  if (isExistingConfirmedEmailSignup(data.user)) {
    throw new AppError('UNAUTHORIZED', new Error('User already registered'));
  }
  await setPendingEmailConfirmationStorage(input.email, 'signup');
  return 'signup';
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl(),
  });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
}

export async function resendEmailConfirmation(
  email: string,
  type: ConfirmationType,
): Promise<void> {
  const address = email.trim();
  if (!address) throw new AppError('VALIDATION', new Error('Confirmation email is unavailable'));
  const { error } = await supabase.auth.resend({
    type,
    email: address,
    options: { emailRedirectTo: authCallbackUrl() },
  });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
  await setPendingEmailConfirmationStorage(address, type);
}

/**
 * Open the Google OAuth page and wait for either:
 * 1) WebBrowser openAuthSessionAsync success URL, or
 * 2) a Linking deep-link event (Android Custom Tabs often only deliver via Linking).
 *
 * Without the Linking race, Android Expo Go frequently hangs after account pick.
 */
export async function openGoogleAuthSession(authUrl: string): Promise<string | null> {
  const redirectTo = authCallbackUrl();

  if (Platform.OS === 'android') {
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      // optional
    }
  }

  let settled = false;
  const cleanupFns: Array<() => void> = [];
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const linkingPromise = new Promise<string | null>((resolve) => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (settled) return;
      if (!looksLikeAuthCallback(url)) return;
      settled = true;
      if (__DEV__) console.log('[auth] Linking captured auth callback');
      // dismissAuthSession throws synchronously on Android (no native
      // dismissBrowser); uncaught inside this listener it kills the app.
      try {
        WebBrowser.dismissAuthSession();
      } catch {
        // the Custom Tab closes on its own once the app is foregrounded
      }
      resolve(url);
    });
    cleanupFns.push(() => sub.remove());
  });

  try {
    if (__DEV__) {
      console.log('[auth] openAuthSession redirectTo =', redirectTo);
      console.log('[auth] openAuthSession authUrl host =', (() => {
        try {
          return new URL(authUrl).host;
        } catch {
          return authUrl.slice(0, 80);
        }
      })());
    }

    const browserPromise = WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
      preferEphemeralSession: Platform.OS === 'ios',
      // Keep the Custom Tab inside this app's task on Android. MainActivity is
      // singleTask, so koupa://callback fired from a *separate* task (which is
      // what createTask + BrowserProxyActivity's ".webContainer" taskAffinity
      // produces) makes Android tear down and relaunch the app instead of
      // delivering onNewIntent. Same task means the callback comes back here.
      createTask: false,
    }).then((response) => {
      if (settled) return null;
      if (response.type === 'success' && 'url' in response && response.url) {
        settled = true;
        if (__DEV__) console.log('[auth] WebBrowser returned an auth callback');
        return response.url;
      }
      if (__DEV__) console.log('[auth] WebBrowser response type =', response.type);
      // cancel/dismiss may still race with Linking — wait briefly for deep link.
      return null;
    });

    const timeoutPromise = new Promise<string | null>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(null), 30_000);
    });

    const result = await Promise.race([
      browserPromise.then(async (url) => {
        if (url) return url;
        // Browser closed without URL — give Linking a short window to deliver.
        await new Promise((r) => setTimeout(r, 1500));
        return null;
      }),
      linkingPromise,
      timeoutPromise,
    ]);

    return result;
  } finally {
    settled = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    for (const cleanup of cleanupFns) cleanup();
    if (Platform.OS === 'android') {
      try {
        await WebBrowser.coolDownAsync();
      } catch {
        // optional
      }
    }
  }
}

export type AuthCallbackResult = {
  readonly kind: 'session' | 'recovery' | 'collision' | 'empty';
};

/**
 * PKCE auth codes are single-use. The Google OAuth callback can reach
 * completeAuthCallback through two paths at once: the inline consumer in
 * signInWithGoogle (Linking / WebBrowser) and the deep-linked /callback route.
 * Both mount before either finishes, so the same code would otherwise be
 * exchanged twice and the second exchange would fail. This map shares one
 * exchange promise per code so the code is consumed exactly once and every
 * consumer resolves with the same outcome.
 */
const exchangePromises = new Map<string, Promise<User | null>>();

async function exchangeCodeOnce(code: string): Promise<User | null> {
  const inFlight = exchangePromises.get(code);
  if (inFlight) return inFlight;

  const exchange = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ data, error }) => {
      if (error) throw toAppError(error, 'UNAUTHORIZED');
      return data.user ?? data.session?.user ?? null;
    });

  exchangePromises.set(code, exchange);
  exchange
    .catch(() => undefined)
    .finally(() => {
      exchangePromises.delete(code);
    });

  return exchange;
}

async function approveGoogleIdentityLink(): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { koupa_google_linked: true },
  });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
}

export async function completeAuthCallback(
  url: string,
  role?: UserRole,
  approveGoogleLink = false,
): Promise<AuthCallbackResult> {
  const params = parseAuthCallback(url);
  const isRecovery = params.type === 'recovery' || params.flow === 'recovery' || params.recovery === '1';
  if (params.error || params.error_description) {
    const description = params.error_description ?? params.error ?? 'Auth callback failed';
    throw new AppError('UNAUTHORIZED', new Error(description));
  }

  const hasExchangePayload = Boolean(
    params.code
    || (params.token_hash && params.type)
    || (params.access_token && params.refresh_token),
  );
  if (!hasExchangePayload) {
    return { kind: 'empty' };
  }

  let callbackUser: User | null = null;
  if (params.code) {
    callbackUser = await exchangeCodeOnce(params.code);
  } else if (params.token_hash && params.type) {
    const type =
      params.type === 'recovery'
        ? 'recovery'
        : params.type === 'email_change'
          ? 'email_change'
          : params.type === 'signup'
            ? 'signup'
            : 'email';
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type });
    if (error) throw toAppError(error, 'UNAUTHORIZED');
    callbackUser = data.user ?? data.session?.user ?? null;
  } else if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw toAppError(error, 'UNAUTHORIZED');
    callbackUser = data.user ?? data.session?.user ?? null;
  }

  const user = callbackUser ?? (await supabase.auth.getUser()).data.user;
  const newGoogleIdentity = user?.identities?.find((identity) => identity.provider === 'google');
  if (hasUnapprovedGoogleCollision(user) && newGoogleIdentity) {
    if (approveGoogleLink) {
      await approveGoogleIdentityLink();
    } else {
      await supabase.auth.unlinkIdentity(newGoogleIdentity);
      await supabase.auth.signOut();
      throw new AppError(
        'UNAUTHORIZED',
        new Error('Existing password sign-in is required before linking Google'),
      );
    }
  }

  if (role && !isRecovery) {
    // Existing profiles have an immutable role. A Google signup attempt can
    // also return an already-authenticated account, so never let the new
    // signup choice rewrite that account's role metadata.
    const userId = user?.id;
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw toAppError(profileError, 'UNAUTHORIZED');
      if (profile) {
        if (profile.role !== user.user_metadata?.koupa_role) {
          await updateUserRole(profile.role);
        }
      } else {
        await updateUserRole(role, true);
      }
    } else {
      await updateUserRole(role, true);
    }
  }
  await clearPendingEmailConfirmationStorage();

  if (isRecovery) {
    return { kind: 'recovery' };
  }
  return { kind: 'session' };
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error, 'UNAUTHORIZED');
}

export async function signInWithGoogle(role?: UserRole): Promise<AuthCallbackResult> {
  if (role) {
    await setPendingRoleStorage(role);
  }

  const redirectTo = authCallbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error || !data.url) {
    throw toAppError(error ?? new Error('Google sign-in URL is unavailable'), 'UNAUTHORIZED');
  }

  // Always log — this is the value that must be in Supabase Redirect URLs.
  console.log('[auth] ADD THIS EXACT URL TO SUPABASE REDIRECT URLS →', redirectTo);
  console.log('[auth] Google OAuth start url host →', (() => {
    try {
      return new URL(data.url).origin;
    } catch {
      return 'invalid';
    }
  })());

  const callback = await openGoogleAuthSession(data.url);
  if (!callback) {
    console.log('[auth] Google OAuth returned no callback URL (cancel or redirect not intercepted)');
    return { kind: 'empty' };
  }

  console.log('[auth] Google callback captured');
  return completeAuthCallback(callback, role);
}

export async function linkGoogleIdentity(): Promise<AuthCallbackResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw toAppError(userError, 'UNAUTHORIZED');
  if (userData.user?.identities?.some((identity) => identity.provider === 'google')) {
    await approveGoogleIdentityLink();
    return { kind: 'session' };
  }

  const redirectTo = authCallbackUrl();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) {
    throw toAppError(error ?? new Error('Google linking URL is unavailable'), 'UNAUTHORIZED');
  }

  const callback = await openGoogleAuthSession(data.url);
  if (!callback) return { kind: 'empty' };
  return completeAuthCallback(callback, undefined, true);
}
