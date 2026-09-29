import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/src/components/ui';
import { useAccountLifecycle } from '@/src/hooks/useAccountLifecycle';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, space, typography } from '@/src/theme';

import { DeleteAccountButton } from './DeleteAccountButton';

/**
 * Lets someone who is stuck in profile setup (for example on a phone number that
 * belongs to another account) delete the half-made account and start over. The
 * profile screens only offer this once a profile exists.
 */
export function SetupDeleteAccount({ disabled = false }: { readonly disabled?: boolean }) {
  const { signOut } = useAppSession();
  const account = useAccountLifecycle();

  const deleteAccount = async (): Promise<boolean> => {
    const deleted = await account.deleteAccount();
    if (!deleted) return false;
    try {
      await signOut();
    } catch {
      // The login is already gone; the session listener finishes the sign-out.
    }
    router.replace('/');
    return true;
  };

  return (
    <View style={styles.wrap} testID="setup-delete-account">
      <Text style={styles.hint}>{t('auth.setupDeleteHint')}</Text>
      <ErrorBanner error={account.error} />
      <DeleteAccountButton onConfirm={deleteAccount} disabled={disabled || account.loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
    marginTop: space[4],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
});
