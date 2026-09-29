import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { consumePendingIntent, hydratePendingIntent } from '@/src/navigation/pendingIntent';
import { resolveAppDestination, type AppDestination } from '@/src/navigation/resolveRoute';
import { resolveStartupHref } from '@/src/navigation/resolveStartupHref';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors } from '@/src/theme';

/**
 * Session gate. Uses a one-shot replace per destination to avoid Redirect remount loops.
 */
export default function Index() {
  const session = useAppSession();
  const lastHref = useRef<Href | null>(null);
  const [intentReady, setIntentReady] = useState(false);

  // A destination saved before the app closed must be restored before routing.
  useEffect(() => {
    let active = true;
    void hydratePendingIntent().finally(() => {
      if (active) setIntentReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const destination: AppDestination = resolveAppDestination({
    loading: session.loading,
    hasSession: Boolean(session.session),
    guestBrowsing: session.guestBrowsing,
    emailConfirmed: session.emailConfirmed,
    pendingConfirmationEmail: session.pendingConfirmationEmail,
    profile: session.profile,
    pendingRole: session.pendingRole,
    signupConsent: session.signupConsent,
    legalAccepted: session.legalAccepted,
    legalConsentRequired: session.legalConsentRequired,
    legalError: session.legalError,
    bootstrapError: session.bootstrapError,
    profileError: session.profileError,
  });

  useEffect(() => {
    if (destination === 'loading' || !intentReady) return;
    const href = consumePendingIntent(destination)
      ?? resolveStartupHref(destination);
    if (!href) return;
    if (lastHref.current === href) return;
    lastHref.current = href;
    router.replace(href);
  }, [destination, intentReady]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
