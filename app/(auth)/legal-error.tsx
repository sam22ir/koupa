import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, Button, ErrorBanner } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { colors, space, typography } from '@/src/theme';

export default function LegalErrorScreen() {
  const { retryLegalAcceptance, signOut } = useAppSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      await retryLegalAcceptance();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.legalRecoveryTitle')} subtitle={t('auth.legalRecoveryBody')} showBack={false}>
      <View style={styles.links}>
        <Pressable accessibilityRole="link" accessibilityLabel={t('auth.openTerms')} onPress={() => void Linking.openURL(TERMS_URL).catch(() => undefined)}>
          <Text style={styles.link}>{t('auth.openTerms')}</Text>
        </Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel={t('auth.openPrivacy')} onPress={() => void Linking.openURL(PRIVACY_URL).catch(() => undefined)}>
          <Text style={styles.link}>{t('auth.openPrivacy')}</Text>
        </Pressable>
      </View>
      <ErrorBanner error={error} />
      <Button label={t('common.retry')} loading={busy} onPress={() => void retry()} />
      <Button
        label={t('auth.changeAccount')}
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void signOut()
            .then(() => router.replace('/(auth)/welcome'))
            .catch((caught) => setError(caught));
        }}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row-reverse',
    gap: space[5],
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
});
