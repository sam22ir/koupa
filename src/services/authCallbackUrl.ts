import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Installed Android / dev-client / Play callback. Must match Supabase Redirect URLs exactly. */
export const NATIVE_AUTH_CALLBACK_URL = 'koupa://callback';

function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

/**
 * OAuth / email redirect target used by Supabase `redirectTo`.
 *
 * Expo Go: exp://host:8081/--/callback
 * Dev client / Play: koupa://callback
 * Web: EXPO_PUBLIC_AUTH_REDIRECT_URL or the current origin
 */
export function authCallbackUrl(): string {
  if (Platform.OS === 'web') {
    const configuredWebRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
    if (configuredWebRedirect) return configuredWebRedirect;
    return makeRedirectUri({ path: 'callback' });
  }

  // Never let makeRedirectUri invent koupa:///callback or
  // exp+koupa://expo-development-client/--/callback. Supabase compares the
  // redirect string exactly, and those variants are not allow-listed.
  if (!isExpoGoRuntime()) {
    return NATIVE_AUTH_CALLBACK_URL;
  }

  // Expo Go must return through the current Metro URL including /--/
  // so Expo Router actually mounts app/callback.tsx.
  return Linking.createURL('/callback');
}
