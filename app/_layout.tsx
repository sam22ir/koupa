import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export interface RootLayoutProps {}
export default function RootLayout(_: RootLayoutProps) {
  const [loaded, error] = useFonts({ IBMPlexSansArabicRegular: require('../assets/fonts/IBMPlexSansArabic-Regular.ttf'), IBMPlexSansArabicMedium: require('../assets/fonts/IBMPlexSansArabic-Medium.ttf'), IBMPlexSansArabicSemiBold: require('../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'), IBMPlexSansArabicBold: require('../assets/fonts/IBMPlexSansArabic-Bold.ttf') });
  useEffect(() => { if (error) throw error; if (loaded) void SplashScreen.hideAsync(); }, [error, loaded]);
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
