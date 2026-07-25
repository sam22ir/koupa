import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BarberNavigation } from '@/src/components/molecules/BarberNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function BarberProfile() {
  const { profile, signOut } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.replace('/(auth)/welcome');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen footer={<BarberNavigation active="حسابي" />}>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.barber.profileTitle}</Text>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.meta}>{profile?.phone}</Text>
        {profile?.is_published ? <Text style={styles.status}>{copy.barber.published}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton label={copy.barber.logout} variant="outline" loading={loggingOut} onPress={() => void logout()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.sm },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' },
  meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' },
  status: { color: colors.primary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body, textAlign: 'right' },
  actions: { marginTop: 'auto', gap: spacing.sm },
});
