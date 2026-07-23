import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export interface IndexProps {}
export default function Index(_: IndexProps) {
  const { session, profile, loading, pendingRole, emailConfirmed, legalAccepted } = useSession();
  if (loading) return <Screen scroll={false}><View style={styles.center}><BrandLogo size={120} /><Text style={styles.tagline}>{copy.splashTagline}</Text><ActivityIndicator color={colors.primary} /></View></Screen>;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile && pendingRole && (!emailConfirmed || !legalAccepted)) return <Redirect href="/(auth)/email-confirmation" />;
  if (!profile && pendingRole === 'customer') return <Redirect href="/(auth)/customer-profile" />;
  if (!profile && pendingRole === 'barber') return <Redirect href="/(barber-onboarding)" />;
  if (!profile) return <Redirect href="/(auth)/role" />;
  if (profile.role === 'customer') return <Redirect href="/(customer)/home" />;
  return <Redirect href="/(barber)/home" />;
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }, tagline: { color: colors.charcoal, fontFamily: typography.fontFamily.medium, fontSize: typography.size.label } });
