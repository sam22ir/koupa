import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/src/hooks/useSession';
export interface CustomerLayoutProps {}
export default function CustomerLayout(_: CustomerLayoutProps) {
  const { loading, profile } = useSession();
  if (loading) return null;
  if (profile?.role !== 'customer') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
