import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { destinationHref } from '@/src/navigation/paths';
import { consumePendingIntent } from '@/src/navigation/pendingIntent';
import { resolveAppDestination, type AppDestination } from '@/src/navigation/resolveRoute';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors } from '@/src/theme';

/**
 * Session gate. Uses a one-shot replace per destination to avoid Redirect remount loops.
 */
export default function Index() {
  const session = useAppSession();
  const lastHref = useRef<Href | null>(null);

  const destination: AppDestination = resolveAppDestination({
    loading: session.loading,
    hasSession: Boolean(session.session),
    emailConfirmed: session.emailConfirmed,
    pendingConfirmationEmail: session.pendingConfirmationEmail,
    profile: session.profile,
    pendingRole: session.pendingRole,
    legalAccepted: session.legalAccepted,
    legalConsentRequired: session.legalConsentRequired,
    legalError: session.legalError,
    bootstrapError: session.bootstrapError,
    profileError: session.profileError,
  });

  useEffect(() => {
    if (destination === 'loading') return;
    const href = consumePendingIntent(destination) ?? destinationHref(destination);
    if (lastHref.current === href) return;
    lastHref.current = href;
    router.replace(href);
  }, [destination]);

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
