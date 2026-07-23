import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/src/hooks/useSession';

export default function BarberLayout() {
  const { loading, profile } = useSession();
  if (loading) return null;
  if (profile?.role !== 'barber' || !profile.is_published) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
