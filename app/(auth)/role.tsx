import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserRole } from '@/src/data/onboarding';
import { AuthShell, Button, ErrorBanner, Icon } from '@/src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import * as legalService from '@/src/services/legal';
import type { LegalDocument } from '@/src/services/legal';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

export default function RoleScreen() {
  const { setPendingRole } = useAppSession();
  const [role, setRole] = useState<UserRole>('customer');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState<readonly LegalDocument[]>([]);
  const [legalLoading, setLegalLoading] = useState(true);
  const [legalLoadError, setLegalLoadError] = useState<unknown>(null);

  const loadDocuments = () => {
    setLegalLoading(true);
    setLegalLoadError(null);
    let active = true;
    void legalService
      .loadLegalDocuments()
      .then((docs) => {
        if (active) setDocuments(docs);
      })
      .catch((caught) => {
        if (active) {
          setDocuments([]);
          setLegalLoadError(caught);
        }
      })
      .finally(() => {
        if (active) setLegalLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => loadDocuments(), []);

  const terms = documents.find((doc) => doc.key === 'terms');
  const privacy = documents.find((doc) => doc.key === 'privacy');
  const legalReady = Boolean(terms?.url && privacy?.url);
  const canContinue = accepted && legalReady && !busy;

  const continueSignup = async () => {
    if (!accepted) {
      setError(new Error(t('auth.legalRequired')));
      return;
    }
    if (!legalReady) {
      setError(new Error(t('auth.legalMissing')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setPendingRole(role);
      router.push({ pathname: '/(auth)/sign-up', params: { role } });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.chooseRole')} subtitle={t('auth.roleHint')}>
      {legalLoading ? (
        <View accessibilityLabel={t('common.loading')} style={styles.skeletonGroup}>
          <View style={styles.skeletonRole} />
          <View style={styles.skeletonRole} />
          <View style={styles.skeletonLegal} />
        </View>
      ) : (
        <>
          <View style={styles.roles}>
            {(['customer', 'barber'] as const).map((value) => {
              const active = role === value;
              const label = value === 'customer' ? t('auth.roleCustomer') : t('auth.roleBarber');
              const description = value === 'customer'
                ? t('auth.roleCustomerDescription')
                : t('auth.roleBarberDescription');
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setRole(value)}
                  style={({ pressed }) => [
                    styles.roleCard,
                    active && styles.roleActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                    {label}
                  </Text>
                  <Text style={[styles.roleDescription, active && styles.roleDescriptionActive]}>
                    {description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legalRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={t('auth.acceptLegal')}
              accessibilityState={{ checked: accepted, disabled: !legalReady }}
              disabled={!legalReady}
              onPress={() => setAccepted((value) => !value)}
              style={({ pressed }) => [styles.checkboxTarget, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
                {accepted ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}
              </View>
            </Pressable>

            <View style={styles.legalCopy}>
              <Text style={styles.legalText}>{t('auth.acceptLegal')}</Text>
              <View style={styles.links}>
                {terms?.url || legalLoadError ? (
                  <Text
                    accessibilityRole="link"
                    accessibilityLabel={t('auth.openTerms')}
                    style={styles.link}
                    onPress={() => void Linking.openURL(TERMS_URL)}
                  >
                    {t('auth.openTerms')}
                  </Text>
                ) : null}
                {privacy?.url || legalLoadError ? (
                  <Text
                    accessibilityRole="link"
                    accessibilityLabel={t('auth.openPrivacy')}
                    style={styles.link}
                    onPress={() => void Linking.openURL(PRIVACY_URL)}
                  >
                    {t('auth.openPrivacy')}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {legalLoadError ? (
            <>
              <ErrorBanner error={legalLoadError} />
              <Button label={t('common.retry')} variant="secondary" onPress={loadDocuments} />
            </>
          ) : null}
          {!legalReady ? <Text style={styles.legalWarn}>{t('auth.legalMissing')}</Text> : null}
          <ErrorBanner error={error} />
          <Button
            label={t('auth.continue')}
            onPress={() => void continueSignup()}
            loading={busy}
            disabled={!canContinue}
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  roles: {
    gap: space[2],
  },
  roleCard: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space[4],
    alignItems: 'flex-end',
    gap: space[1],
  },
  roleActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleLabel: {
    ...typography.bodyStrong,
    color: colors.textMuted,
  },
  roleLabelActive: {
    color: colors.primary,
  },
  roleDescription: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  roleDescriptionActive: {
    color: colors.text,
  },
  legalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[2],
  },
  checkboxTarget: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  legalCopy: {
    flex: 1,
    gap: space[1],
    paddingTop: space[2],
  },
  legalText: {
    ...typography.body,
    textAlign: 'right',
  },
  links: {
    flexDirection: 'row-reverse',
    gap: space[4],
  },
  link: {
    ...typography.label,
    color: colors.primary,
  },
  legalWarn: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  skeletonGroup: {
    gap: space[2],
  },
  skeletonRole: {
    height: 84,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonLegal: {
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
});
