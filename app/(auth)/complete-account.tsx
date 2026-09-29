import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserRole } from '@/src/auth';
import { AuthShell, Button, ErrorBanner, Icon } from '@/src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

const roleOptions: ReadonlyArray<{
  readonly role: UserRole;
  readonly title: string;
  readonly description: string;
}> = [
  {
    role: 'customer',
    title: t('auth.roleCustomer'),
    description: t('auth.welcomeDoorCustomerSub'),
  },
  {
    role: 'barber',
    title: t('auth.roleBarber'),
    description: t('auth.welcomeDoorBarberSub'),
  },
];

export default function CompleteAccountScreen() {
  const {
    acceptCurrentLegalDocuments,
    confirmProfilelessRole,
    legalDocuments,
    retrySession,
    signOut,
    busy,
  } = useAppSession();
  const [role, setRole] = useState<UserRole | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const legalReady = legalDocuments.some((document) => document.key === 'terms' && document.url)
    && legalDocuments.some((document) => document.key === 'privacy' && document.url);

  const continueSetup = async () => {
    if (!role || !accepted || !legalReady) return;
    setSaving(true);
    setError(null);
    try {
      // Save the user's explicit acceptance before setting signup metadata.
      // Session listeners may run as soon as updateUserRole emits USER_UPDATED.
      await acceptCurrentLegalDocuments();
      await confirmProfilelessRole(role);
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
    }
  };

  const changeAccount = async () => {
    setSaving(true);
    setError(null);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.completeAccountTitle')}
      subtitle={t('auth.completeAccountBody')}
      showBack={false}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        {roleOptions.map((option) => {
          const selected = role === option.role;
          return (
            <Pressable
              key={option.role}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.title}. ${option.description}`}
              onPress={() => setRole(option.role)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legalLinks}>
        <Text accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(TERMS_URL).catch(() => undefined)}>
          {t('auth.openTerms')}
        </Text>
        <Text accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL).catch(() => undefined)}>
          {t('auth.openPrivacy')}
        </Text>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('auth.roleIntroConsent')}
        accessibilityState={{ checked: accepted, disabled: !legalReady }}
        disabled={!legalReady || saving || busy}
        onPress={() => setAccepted((value) => !value)}
        style={styles.consent}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted ? <Icon name="checkmark" size={15} color={colors.onPrimary} /> : null}
        </View>
        <Text style={styles.consentText}>{t('auth.roleIntroConsent')}</Text>
      </Pressable>

      {!legalReady ? (
        <View style={styles.legalMissing}>
          <Text style={styles.legalMissingText}>{t('auth.legalMissing')}</Text>
          <Button
            label={t('common.retry')}
            variant="secondary"
            onPress={() => void retrySession().catch(setError)}
          />
        </View>
      ) : null}
      <ErrorBanner error={error} />
      <Button
        label={t('auth.completeAccountCta')}
        disabled={!role || !accepted || !legalReady || saving}
        loading={saving || busy}
        onPress={() => void continueSetup()}
      />
      <Button
        label={t('auth.changeAccount')}
        variant="secondary"
        disabled={saving || busy}
        onPress={() => void changeAccount()}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: space[3],
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: space[4],
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionCopy: {
    flex: 1,
    gap: space[1],
    alignItems: 'flex-end',
  },
  optionTitle: {
    ...typography.label,
    color: colors.text,
    textAlign: 'right',
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  legalLinks: {
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
  legalMissing: {
    gap: space[2],
  },
  legalMissingText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
});
