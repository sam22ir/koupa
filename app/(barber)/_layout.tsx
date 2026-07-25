import { Redirect, Stack, router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useSession } from '@/src/hooks/useSession';

export default function BarberLayout() {
  const { loading, profile } = useSession();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  useEffect(() => {
    if (loading || profile?.role !== 'barber' || !profile.is_published) return;
    const handleNativeBack = () => {
      if (pathnameRef.current === '/home') return false;
      if (router.canGoBack()) { router.back(); return true; }
      router.replace('/(barber)/home');
      return true;
    };
    const nativeSubscription = Platform.OS === 'android' ? BackHandler.addEventListener('hardwareBackPress', handleNativeBack) : null;
    if (Platform.OS !== 'web') return () => nativeSubscription?.remove();
    const handleBrowserBack = () => {
      if (pathnameRef.current === '/home') return;
      if (!router.canGoBack()) router.replace('/(barber)/home');
    };
    window.history.pushState({ koupaBarberBackGuard: true }, '', window.location.href);
    window.addEventListener('popstate', handleBrowserBack);
    return () => { nativeSubscription?.remove(); window.removeEventListener('popstate', handleBrowserBack); };
  }, [loading, profile?.is_published, profile?.role]);
  if (loading) return null;
  if (profile?.role !== 'barber' || !profile.is_published) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
