import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, Button, ErrorBanner, Icon } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { colors, radii, space, typography } from '@/src/theme';

function openExternalUrl(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

export default function LegalConsentScreen() {
  const { legalDocuments, acceptCurrentLegalDocuments, signOut } = useAppSession();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const legalReady = legalDocuments.some((document) => document.key === 'terms' && document.url)
    && legalDocuments.some((document) => document.key === 'privacy' && document.url);

  const save = async () => {
    if (!accepted || !legalReady) return;
    setBusy(true);
    setError(null);
    try {
      await acceptCurrentLegalDocuments();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const changeAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.legalConsentTitle')}
      subtitle={t('auth.legalConsentBody')}
      showBack={false}
    >
      <View style={styles.links}>
        <Text accessibilityRole="link" style={styles.link} onPress={() => openExternalUrl(TERMS_URL)}>
          {t('auth.openTerms')}
        </Text>
        <Text accessibilityRole="link" style={styles.link} onPress={() => openExternalUrl(PRIVACY_URL)}>
          {t('auth.openPrivacy')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('auth.acceptLegal')}
        accessibilityState={{ checked: accepted, disabled: !legalReady }}
        disabled={!legalReady || busy}
        onPress={() => setAccepted((value) => !value)}
        style={styles.consent}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </View>
        <Text style={styles.consentText}>{t('auth.acceptLegal')}</Text>
      </Pressable>
      {!legalReady ? <Text style={styles.warning}>{t('auth.legalMissing')}</Text> : null}
      <ErrorBanner error={error} />
      <Button
        label={t('auth.saveLegalConsent')}
        disabled={!accepted || !legalReady}
        loading={busy}
        onPress={() => void save()}
      />
      <Button
        label={t('auth.changeAccount')}
        variant="secondary"
        disabled={busy}
        onPress={() => void changeAccount()}
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
  consent: {
    minHeight: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  checkbox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  consentText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    textAlign: 'right',
  },
  warning: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
});
