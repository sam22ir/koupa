import * as Linking from 'expo-linking';
import { router, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { classifyAuthCallback, isGoogleCollisionMessage } from '@/src/auth';
import { Button, Screen } from '@/src/components/ui';
import { formatAuthError } from '@/src/i18n/errors';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { authCallbackUrl } from '@/src/services/authCallbackUrl';
import { colors, space, typography } from '@/src/theme';

type CallbackUi =
  | { readonly status: 'loading' }
  | { readonly status: 'done' }
  | { readonly status: 'recovery' }
  | { readonly status: 'collision'; message: string }
  | { readonly status: 'expired'; message: string }
  | { readonly status: 'error'; message: string };

function buildCallbackUrl(
  params: Record<string, string | string[] | undefined>,
  fallbackUrl: string | null,
): string | null {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  if (query) return `${authCallbackUrl()}?${query}`;
  return fallbackUrl;
}

function preferIncomingCallback(incomingUrl: string | null, reconstructedUrl: string | null): string | null {
  if (incomingUrl && classifyAuthCallback(incomingUrl) !== 'unknown') return incomingUrl;
  return reconstructedUrl ?? incomingUrl;
}

/**
 * Handles koupa://callback outcomes:
 * - PKCE / email confirm → session, then /
 * - recovery → reset password screen
 * - Google collision → password sign-in guidance
 * - expired / provider errors → Arabic error UI
 */
export default function CallbackScreen() {
  const { completeAuthCallback, loading, pendingRole } = useAppSession();
  const globalParams = useGlobalSearchParams();
  const localParams = useLocalSearchParams();
  const routeCallbackUrl = buildCallbackUrl(
    { ...globalParams, ...localParams } as Record<string, string | string[] | undefined>,
    null,
  );
  const [ui, setUi] = useState<CallbackUi>({ status: 'loading' });
  const handled = useRef<string | null>(null);
  // Session updates caused by the exchange itself (loading, pendingRole) re-run
  // the effect below. Its cleanup must not discard the in-flight result, so
  // latest values live in refs and only unmount stops state updates.
  const mounted = useRef(true);
  const latest = useRef({ completeAuthCallback, pendingRole });
  latest.current = { completeAuthCallback, pendingRole };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const run = async (incomingUrl: string | null) => {
      const url = preferIncomingCallback(incomingUrl, routeCallbackUrl);
      if (!url) {
        if (mounted.current) setUi({ status: 'done' });
        return;
      }

      const callbackKey = (() => {
        const params = new URLSearchParams(url.split(/[?#]/)[1] ?? '');
        return params.get('code') || params.get('token_hash') || url;
      })();
      if (handled.current === callbackKey) return;
      handled.current = callbackKey;
      const kind = classifyAuthCallback(url);

      if (kind === 'expired') {
        if (mounted.current) {
          setUi({ status: 'expired', message: t('auth.linkExpiredBody') });
        }
        return;
      }
      if (kind === 'provider_error') {
        if (mounted.current) {
          setUi({ status: 'error', message: t('auth.providerErrorBody') });
        }
        return;
      }

      try {
        const result = await latest.current.completeAuthCallback(
          url,
          latest.current.pendingRole ?? undefined,
        );
        if (!mounted.current) return;
        if (result.kind === 'recovery' || kind === 'recovery') {
          setUi({ status: 'recovery' });
          return;
        }
        setUi({ status: 'done' });
      } catch (caught) {
        if (!mounted.current) return;
        const message = formatAuthError(caught);
        const raw = caught instanceof Error ? caught.message : String(caught ?? '');
        const cause =
          caught instanceof Error && 'cause' in caught && caught.cause instanceof Error
            ? caught.cause.message
            : '';
        if (isGoogleCollisionMessage(raw) || isGoogleCollisionMessage(cause)) {
          setUi({ status: 'collision', message });
          return;
        }
        setUi({ status: 'error', message });
      }
    };

    void (async () => {
      const initial = await Linking.getInitialURL();
      await run(initial);
    })();

    const sub = Linking.addEventListener('url', ({ url }) => {
      void run(url);
    });

    return () => {
      sub.remove();
    };
  }, [loading, routeCallbackUrl]);

  useEffect(() => {
    if (ui.status === 'done') {
      router.replace('/');
    }
    if (ui.status === 'recovery') {
      router.replace('/(auth)/reset-password');
    }
  }, [ui.status]);

  if (ui.status === 'collision') {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.title}>{t('auth.collisionTitle')}</Text>
          <Text style={styles.body}>{ui.message || t('auth.collisionBody')}</Text>
          <Button
            label={t('auth.collisionCta')}
            onPress={() => router.replace({ pathname: '/(auth)/sign-in', params: { collision: '1' } })}
          />
          <Button
            label={t('auth.createAccount')}
            variant="secondary"
            onPress={() => router.replace('/(auth)/welcome')}
          />
        </View>
      </Screen>
    );
  }

  if (ui.status === 'expired' || ui.status === 'error') {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.title}>
            {ui.status === 'expired' ? t('auth.linkExpiredTitle') : t('auth.providerErrorTitle')}
          </Text>
          <Text style={styles.body}>{ui.message}</Text>
          <Button label={t('auth.signIn')} onPress={() => router.replace('/(auth)/sign-in')} />
          <Button
            label={t('common.retry')}
            variant="secondary"
            onPress={() => router.replace('/(auth)/welcome')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.caption}>{t('common.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.background,
    padding: space[5],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[4],
  },
  title: {
    ...typography.titleSm,
    textAlign: 'right',
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'right',
  },
  caption: {
    ...typography.caption,
  },
});
