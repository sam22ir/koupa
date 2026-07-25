import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getPendingRole, hasSignupConsent, hasUnapprovedGoogleCollision, parseAuthCallback, type CredentialMethod, type UserRole } from '@/src/auth';

WebBrowser.maybeCompleteAuthSession();

export interface Profile { readonly id: string; readonly role: UserRole; readonly name: string; readonly phone: string; readonly is_published: boolean; }
export interface LegalDocument { readonly key: 'terms' | 'privacy'; readonly version: string; readonly url: string; }
export interface UseSessionProps {}

const pendingRoleKey = 'koupa.pending-role';
const pendingConfirmationEmailKey = 'koupa.pending-confirmation-email';
const pendingConfirmationTypeKey = 'koupa.pending-confirmation-type';
type ConfirmationType = 'signup' | 'email_change';
function callbackUrl(): string { return Platform.OS === 'web' ? Linking.createURL('/callback') : 'koupa://callback'; }

export function useSession(_: UseSessionProps = {}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRole, setPendingRoleState] = useState<UserRole | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<readonly LegalDocument[]>([]);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [pendingConfirmationType, setPendingConfirmationType] = useState<ConfirmationType>('signup');

  const setPendingEmailConfirmation = useCallback(async (email: string, type: ConfirmationType) => {
    await Promise.all([AsyncStorage.setItem(pendingConfirmationEmailKey, email), AsyncStorage.setItem(pendingConfirmationTypeKey, type)]);
    setPendingConfirmationEmail(email);
    setPendingConfirmationType(type);
  }, []);

  const clearPendingEmailConfirmation = useCallback(async () => {
    await Promise.all([AsyncStorage.removeItem(pendingConfirmationEmailKey), AsyncStorage.removeItem(pendingConfirmationTypeKey)]);
    setPendingConfirmationEmail('');
    setPendingConfirmationType('signup');
  }, []);
  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('id,role,name,phone,is_published').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  const loadLegalDocuments = useCallback(async () => {
    const { data, error } = await supabase.from('legal_documents').select('key,version,url').eq('is_active', true);
    if (error) throw error;
    const documents = (data ?? []) as LegalDocument[];
    setLegalDocuments(documents);
    return documents;
  }, []);

  const acceptLegalDocuments = useCallback(async (userId: string, documents?: readonly LegalDocument[]) => {
    const activeDocuments = documents ?? await loadLegalDocuments();
    if (activeDocuments.length !== 2) throw new Error('Legal documents are not configured');
    const { data: existing, error: existingError } = await supabase.from('legal_acceptances').select('document_key,document_version').eq('user_id', userId);
    if (existingError) throw existingError;
    const rows = activeDocuments.filter((document) => !existing?.some((item) => item.document_key === document.key && item.document_version === document.version)).map((document) => ({ user_id: userId, document_key: document.key, document_version: document.version }));
    if (!rows.length) { setLegalAccepted(true); return; }
    const { error } = await supabase.from('legal_acceptances').insert(rows);
    if (error) throw error;
    setLegalAccepted(true);
  }, [loadLegalDocuments]);

  const syncUser = useCallback(async (user: User | null) => {
    if (!user) { setProfile(null); setLegalAccepted(false); return; }
    await loadProfile(user.id);
    const metadataRole = getPendingRole(user);
    if (metadataRole) setPendingRoleState(metadataRole);
    if (!hasSignupConsent(user) || !user.email_confirmed_at) return;
    try {
      const documents = await loadLegalDocuments();
      const { data, error } = await supabase.from('legal_acceptances').select('document_key,document_version').eq('user_id', user.id);
      if (error) throw error;
      const accepted = documents.length === 2 && documents.every((document) => data?.some((item) => item.document_key === document.key && item.document_version === document.version));
      if (accepted) setLegalAccepted(true);
      else await acceptLegalDocuments(user.id, documents);
      setLegalError(null);
    } catch {
      setLegalError('تعذر حفظ موافقتك على المستندات القانونية. حاول مرة أخرى.');
    }
  }, [acceptLegalDocuments, loadLegalDocuments, loadProfile]);

  useEffect(() => {
    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(pendingRoleKey), AsyncStorage.getItem(pendingConfirmationEmailKey), AsyncStorage.getItem(pendingConfirmationTypeKey)]).then(async ([{ data: { session: current } }, storedRole, storedEmail, storedType]) => {
      setSession(current);
      setPendingRoleState(storedRole === 'barber' || storedRole === 'customer' ? storedRole : getPendingRole(current?.user ?? null));
      setPendingConfirmationEmail(storedEmail ?? '');
      setPendingConfirmationType(storedType === 'email_change' ? 'email_change' : 'signup');
      await syncUser(current?.user ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); void syncUser(next?.user ?? null); });
    return () => subscription.subscription.unsubscribe();
  }, [syncUser]);

  const setPendingRole = useCallback(async (role: UserRole) => {
    await AsyncStorage.setItem(pendingRoleKey, role);
    setPendingRoleState(role);
    if (session) await supabase.auth.updateUser({ data: { koupa_role: role } });
  }, [session]);

  const clearPendingRole = useCallback(async () => { await AsyncStorage.removeItem(pendingRoleKey); setPendingRoleState(null); }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await Promise.all([AsyncStorage.removeItem(pendingRoleKey), clearPendingEmailConfirmation()]);
  }, [clearPendingEmailConfirmation]);

  const signInWithGoogle = useCallback(async (role?: UserRole) => {
    if (role) await setPendingRole(role);
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl(), skipBrowserRedirect: true } });
    if (error || !data.url) throw error ?? new Error('Google sign-in URL is unavailable');
    const response = await WebBrowser.openAuthSessionAsync(data.url, callbackUrl());
    if (response.type === 'success') await completeAuthCallback(response.url, role);
  }, [setPendingRole]);

  const signUpWithPassword = useCallback(async ({ method, email, phone, password, role }: { readonly method: CredentialMethod; readonly email: string; readonly phone?: string; readonly password: string; readonly role: UserRole; }) => {
    const metadata = { koupa_role: role, koupa_signup_consent: true };
    if (method === 'email') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl(), data: metadata } });
      if (error) throw error;
      await setPendingEmailConfirmation(email, 'signup');
      return;
    }
    if (!phone) throw new Error('Phone is required');
    const { data, error } = await supabase.auth.signUp({ phone, password, options: { data: metadata } });
    if (error) throw error;
    if (!data.session) throw new Error('Phone registration session is unavailable');
    const { error: recoveryError } = await supabase.auth.updateUser({ email, data: metadata });
    if (recoveryError) throw recoveryError;
    await setPendingEmailConfirmation(email, 'email_change');
  }, [setPendingEmailConfirmation]);

  const signInWithPassword = useCallback(async (method: CredentialMethod, identifier: string, password: string) => {
    const credentials = method === 'email' ? { email: identifier, password } : { phone: identifier, password };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
    if (error) throw error;
  }, []);

  const resendEmailConfirmation = useCallback(async (email: string) => {
    const address = email.trim();
    if (!address) throw new Error('Confirmation email is unavailable');
    const { error } = await supabase.auth.resend({ type: pendingConfirmationType, email: address, options: { emailRedirectTo: callbackUrl() } });
    if (error) throw error;
    await setPendingEmailConfirmation(address, pendingConfirmationType);
  }, [pendingConfirmationType, setPendingEmailConfirmation]);

  const completeAuthCallback = useCallback(async (url: string, role?: UserRole) => {
    const params = parseAuthCallback(url);
    if (params.error || params.error_description) throw new Error(params.error_description ?? params.error);
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
    } else if (params.token_hash && params.type) {
      const type = params.type === 'recovery' ? 'recovery' : params.type === 'email_change' ? 'email_change' : params.type === 'signup' ? 'signup' : 'email';
      const { error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type });
      if (error) throw error;
    } else if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
      if (error) throw error;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const newGoogleIdentity = user?.identities?.find((identity) => identity.provider === 'google');
    if (hasUnapprovedGoogleCollision(user) && newGoogleIdentity) {
      await supabase.auth.unlinkIdentity(newGoogleIdentity);
      await supabase.auth.signOut();
      throw new Error('Existing password sign-in is required before linking Google');
    }
    if (role) await supabase.auth.updateUser({ data: { koupa_role: role, koupa_signup_consent: true } });
    await clearPendingEmailConfirmation();
  }, [clearPendingEmailConfirmation]);

  const emailConfirmed = Boolean(session?.user.email_confirmed_at);
  return { session, profile, loading, pendingRole, legalAccepted, legalDocuments, legalError, emailConfirmed, pendingConfirmationEmail, refreshProfile: () => session ? loadProfile(session.user.id) : Promise.resolve(), signInWithGoogle, signUpWithPassword, signInWithPassword, requestPasswordReset, resendEmailConfirmation, completeAuthCallback, setPendingRole, clearPendingRole, signOut };
}
