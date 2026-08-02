import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  LogBox,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { bootstrapRtl } from '@/src/i18n/rtl';
import { SessionProvider, useAppSession } from '@/src/providers/SessionProvider';
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

LogBox.ignoreLogs([
  'Reduced motion setting is enabled',
  'style.resizeMode is deprecated',
]);

function PushBootstrap() {
  const { session } = useAppSession();
  usePushRegistration(session?.user.id);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(getFontAssets());

  // Don't block the whole app forever if a font fails on device.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.bootText}>كوپا</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <SessionProvider>
            <PushBootstrap />
            <StatusBar style="light" />
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
                name="barber/[id]"
                options={{ headerShown: true, title: '', headerTintColor: colors.primary }}
              />
              <Stack.Screen
                name="shop/[id]"
                options={{ headerShown: true, title: '', headerTintColor: colors.primary }}
              />
              <Stack.Screen
                name="book/[barberId]"
                options={{ headerShown: true, title: '', headerTintColor: colors.primary }}
              />
              <Stack.Screen
                name="appointment/[id]"
                options={{ headerShown: true, title: '', headerTintColor: colors.primary }}
              />
              <Stack.Screen
                name="scan"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{ headerShown: true, title: '', headerTintColor: colors.primary }}
              />
              <Stack.Screen name="callback" />
            </Stack>
          </SessionProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
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
});
