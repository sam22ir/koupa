import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/src/hooks/useSession';

export interface BarberLayoutProps {}
export default function BarberLayout(_: BarberLayoutProps) {
  const { loading, profile } = useSession();
  if (loading) return null;
  if (profile?.role === 'barber' && profile.is_published) return <Redirect href="/(barber)/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
