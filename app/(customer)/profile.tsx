import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { useSession } from '@/src/hooks/useSession';
import { privacyUrl, supportEmail, termsUrl } from '@/src/notifications';
import { colors, spacing, typography } from '@/src/theme';

export default function CustomerProfile() {
  const { session, profile, signOut } = useSession();
  usePushRegistration(session?.user.id);
  const { loading: deleting, deleteAccount } = useAccountLifecycle();
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

  const confirmDelete = () => {
    Alert.alert(copy.customer.deleteAccountConfirmTitle, copy.customer.deleteAccountConfirmBody, [
      { text: copy.customer.deleteAccountCancel, style: 'cancel' },
      {
        text: copy.customer.deleteAccountConfirmAction,
        style: 'destructive',
        onPress: () => {
          void deleteAccount().then((ok) => {
            if (ok) router.replace('/(auth)/welcome');
          });
        },
      },
    ]);
  };

  const open = (url: string) => {
    if (!url) return;
    void Linking.openURL(url);
  };

  return (
    <Screen footer={<CustomerNavigation active="حسابي" />}>
      <View style={styles.content}>
        <Text style={styles.title}>حسابي</Text>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.meta}>{profile?.phone}</Text>

        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(customer)/notifications')}>
            <Text style={styles.link}>{copy.customer.notificationsTitle}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => open(`mailto:${supportEmail()}`)}>
            <Text style={styles.link}>{copy.customer.support}: {supportEmail()}</Text>
          </Pressable>
          {termsUrl() ? (
            <Pressable accessibilityRole="link" onPress={() => open(termsUrl())}>
              <Text style={styles.link}>{copy.customer.terms}</Text>
            </Pressable>
          ) : null}
          {privacyUrl() ? (
            <Pressable accessibilityRole="link" onPress={() => open(privacyUrl())}>
              <Text style={styles.link}>{copy.customer.privacy}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={copy.customer.logout} variant="outline" loading={loggingOut} onPress={() => void logout()} />
          <PrimaryButton label={copy.customer.deleteAccount} variant="outline" loading={deleting} onPress={confirmDelete} />
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
  links: { marginTop: spacing.lg, gap: spacing.md },
  link: { color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.body, textAlign: 'right' },
  actions: { marginTop: 'auto', gap: spacing.sm },
});
