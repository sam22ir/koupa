import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFonts } from 'expo-font';
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  LogBox,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { HeroUINativeProvider } from 'heroui-native/provider';
import { Uniwind } from 'uniwind';

import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { bootstrapRtl } from '@/src/i18n/rtl';
import { resolveAppDestination, type AppDestination } from '@/src/navigation/resolveRoute';
import { getGuardedRoute, routeIsAllowed } from '@/src/navigation/routeGuard';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { SessionProvider, useAppSession } from '@/src/providers/SessionProvider';
import { SplashGate } from '@/src/startup/SplashGate';
import { holdSplash, hideSplash, SPLASH_TIMEOUT_MS } from '@/src/startup/splash';
import { colors } from '@/src/theme/colors';
import { getFontAssets } from '@/src/theme/fonts';

// Catch fatal JS errors that otherwise just kill Expo Go with no screen.
const globalAny = globalThis as typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
  };
};

if (globalAny.ErrorUtils?.setGlobalHandler) {
  const previous = globalAny.ErrorUtils.getGlobalHandler?.();
  globalAny.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[KoupaFatal]', isFatal, error?.message, error?.stack);
    previous?.(error, isFatal);
  });
}

bootstrapRtl();
holdSplash();

// Koupa's design (DESIGN.md) is a light paper/teal theme. Pin the active
// theme to "light" regardless of the OS setting so the app never renders the
// unpolished dark palette.
Uniwind.setTheme('light');

LogBox.ignoreLogs([
  'Reduced motion setting is enabled',
  'style.resizeMode is deprecated',
]);

function PushBootstrap() {
  const { session, profile } = useAppSession();
  usePushRegistration(session?.user.id, profile?.role);
  return null;
}

function destinationForSession(session: ReturnType<typeof useAppSession>): AppDestination {
  return resolveAppDestination({
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
}

/**
 * Expo Router can mount a deep-linked screen without first visiting `/`.
 * Reuse the root session decision so private routes cannot bypass auth or role checks.
 */
function SessionRouteGuard({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const session = useAppSession();
  const route = getGuardedRoute(segments);
  const destination = destinationForSession(session);
  const redirectKey = `${route ?? 'public'}:${destination}`;
  const lastRedirect = useRef<string | null>(null);
  const blocked = route !== null && destination !== 'loading' && !routeIsAllowed(route, destination);
  const waiting = route !== null && destination === 'loading';

  useEffect(() => {
    if (!blocked) {
      lastRedirect.current = null;
      return;
    }
    if (lastRedirect.current === redirectKey) return;
    lastRedirect.current = redirectKey;
    setPendingIntentFromPath(pathname, params);
    router.replace('/');
  }, [blocked, params, pathname, redirectKey, router]);

  return (
    <View style={styles.routeGuardContainer}>
      {children}
      {blocked || waiting ? (
        <View style={styles.routeGuard}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(getFontAssets());

  // Never leave people on the splash if startup stalls.
  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Don't block the whole app forever if a font fails on device.
  if (!fontsLoaded && !fontError) {
    // On native the splash is still covering the screen, so draw nothing:
    // a second loading screen here is exactly the flash we are removing.
    if (Platform.OS !== 'web') return null;
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.bootText}>كوپا</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <HeroUINativeProvider>
        <SafeAreaProvider>
        <ErrorBoundary>
          <SessionProvider>
            <PushBootstrap />
            <SplashGate />
            <StatusBar style="light" />
            <SessionRouteGuard>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(barber)" />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen
                  name="scan"
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen name="barber/[id]" />
                <Stack.Screen name="shop/[id]" />
                <Stack.Screen name="book/[barberId]" />
                <Stack.Screen name="appointment/[id]" />
                <Stack.Screen name="barber-appointment/[id]" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="notification/[id]" />
                <Stack.Screen name="callback" />
              </Stack>
            </SessionRouteGuard>
          </SessionProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  bootText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  routeGuard: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  routeGuardContainer: {
    flex: 1,
  },
});
