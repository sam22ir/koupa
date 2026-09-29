import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSignupPhone, normalizeAlgerianPhone } from '@/src/auth';
import { AuthHeader, Button, ErrorBanner, Field } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { setCustomerFindCityPreference } from '@/src/navigation/customerFindPreference';
import { useAppSession } from '@/src/providers/SessionProvider';
import * as onboardingService from '@/src/services/onboarding';
import { colors, layout, radii, space, typography } from '@/src/theme';

function googleDisplayName(user: { readonly user_metadata?: Record<string, unknown> } | null): string {
  const meta = user?.user_metadata ?? {};
  const value = meta.full_name ?? meta.name;
  return typeof value === 'string' ? value.trim() : '';
}

export default function CustomerSetupScreen() {
  const insets = useSafeAreaInsets();
  const { session, refreshProfile, signOut } = useAppSession();
  const [name, setName] = useState(googleDisplayName(session?.user ?? null));
  const [phone, setPhone] = useState(
    getSignupPhone(session?.user ?? null) ?? session?.user.phone ?? '',
  );
  const [city, setCity] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const normalized = normalizeAlgerianPhone(phone);
    if (!name.trim() || !normalized) {
      setError(new Error(t('errors.VALIDATION')));
      return;
    }
    setBusy(true);
    try {
      if (!session?.user.id) throw new Error('No active session');
      const trimmedCity = city.trim();
      await onboardingService.createCustomerProfile(
        session.user.id,
        name.trim(),
        normalized,
        trimmedCity || undefined,
      );
      await setCustomerFindCityPreference(trimmedCity);
      await refreshProfile();
      router.replace('/');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + space[4], layout.screenPaddingTop + space[3]),
            paddingBottom: Math.max(insets.bottom, space[8]),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader showBack={false} progress={t('auth.journeyCustomerSetup')} />

        <View style={styles.header}>
          <Text style={styles.roleLabel}>{t('auth.roleCustomer')}</Text>
          <Text style={styles.title}>{t('auth.pendingProfile')}</Text>
          <Text style={styles.subtitle}>{t('auth.customerSetupSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Field label={t('auth.name')} value={name} onChangeText={setName} />
          <Field
            label={t('auth.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            hint={t('auth.phonePurpose')}
          />
          <Field
            label={t('auth.cityOptional')}
            value={city}
            onChangeText={setCity}
            hint={t('auth.cityOptionalHint')}
          />

          <ErrorBanner error={error} />
          <View style={styles.actions}>
            <Button
              label={t('auth.customerSetupCta')}
              onPress={() => void submit()}
              loading={busy}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.changeAccount')}
              disabled={busy}
              onPress={() => {
                void signOut()
                  .then(() => router.replace('/(auth)/welcome'))
                  .catch((caught) => setError(caught));
              }}
              style={({ pressed }) => [styles.changeAccount, pressed && styles.pressed]}
            >
              <Text style={styles.changeAccountText}>{t('auth.changeAccount')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingX,
  },
  header: {
    marginTop: space[6],
    gap: space[2],
    alignItems: 'flex-end',
  },
  roleLabel: {
    ...typography.label,
    fontSize: 12.5,
    color: colors.primary,
  },
  title: {
    fontFamily: typography.display.fontFamily,
    fontSize: 28,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'right',
  },
  form: {
    marginTop: space[5],
    gap: space[4],
  },
  actions: {
    gap: space[2],
    marginTop: space[1],
  },
  changeAccount: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  changeAccountText: {
    ...typography.label,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
