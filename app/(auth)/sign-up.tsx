import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isValidEmail, isValidPassword, normalizeAlgerianPhone } from '@/src/auth';
import {
  AuthHeader,
  Button,
  ErrorBanner,
  Field,
  Icon,
} from '@/src/components/ui';
import { t } from '@/src/i18n';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import * as authService from '@/src/services/auth';
import * as onboardingService from '@/src/services/onboarding';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role === 'barber' || params.role === 'customer')
    ? params.role
    : null;
  const {
    signUpWithPassword,
    signInWithGoogle,
    setPendingRole,
    refreshProfile,
    busy,
  } = useAppSession();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);

  const isBarber = role === 'barber';

  useEffect(() => {
    if (!role) router.replace('/(auth)/welcome');
  }, [role]);

  if (!role) return null;

  const submit = async () => {
    setError(null);
    setNameError(undefined);
    setEmailError(undefined);
    setPhoneError(undefined);
    setPasswordError(undefined);
    if (!isBarber && !name.trim()) {
      setNameError(t('auth.nameRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }
    if (!isValidPassword(password)) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    const normalizedPhone = normalizeAlgerianPhone(phone);
    if (!normalizedPhone) {
      setPhoneError(t('auth.invalidPhone'));
      return;
    }
    try {
      await setPendingRole(role);
      await signUpWithPassword({
        email: email.trim(),
        phone: normalizedPhone,
        password,
        role,
      });
      if (!isBarber) await createCustomerProfileNow(name.trim(), normalizedPhone);
      // Straight into setup. Confirming the email is still required before a
      // first booking or before a barber profile can be published, and the
      // gate keeps /(auth)/confirm reachable for that.
      router.replace('/');
    } catch (caught) {
      setError(caught);
    }
  };

  // The account already exists, so a failure here is not an error for the user:
  // the route gate falls back to customer-setup, which asks again and retries.
  const createCustomerProfileNow = async (customerName: string, customerPhone: string) => {
    try {
      const current = await authService.getSession();
      if (!current?.user.id) return;
      await onboardingService.createCustomerProfile(current.user.id, customerName, customerPhone);
      await refreshProfile(current.user.id);
    } catch {
      // Handled by the customer-setup fallback.
    }
  };

  const google = async () => {
    setError(null);
    try {
      const result = await signInWithGoogle(role);
      if (result.kind === 'empty') {
        setError(new Error(t('auth.googleCancelled')));
        return;
      }
      if (result.kind === 'recovery') {
        router.replace('/(auth)/reset-password');
        return;
      }
      // Google creates the session; the root gate routes a profileless user to
      // customer-setup (customer) or onboarding (barber) to finish their profile.
      router.replace('/');
    } catch (caught) {
      setError(caught);
    }
  };

  const roleLabel = role === 'barber' ? t('auth.roleBarber') : t('auth.roleCustomer');
  const subtitle = role === 'barber'
    ? t('auth.signUpBarberSubtitle')
    : t('auth.signUpCustomerSubtitle');

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
        <AuthHeader />

        <View style={styles.header}>
          <View style={[styles.roleTag, isBarber && styles.barberRoleTag]}>
            <Text
              style={[
                styles.roleTagText,
                isBarber && styles.barberRoleTagText,
              ]}
            >
              {roleLabel}
            </Text>
          </View>
          <Text style={styles.title}>{t('auth.signUp')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.form}>
          <Button
            label={t('auth.google')}
            variant="secondary"
            onPress={() => void google()}
            disabled={busy}
          />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.or}>{t('auth.or')}</Text>
            <View style={styles.dividerLine} />
          </View>
          {isBarber ? null : (
            <Field
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              error={nameError}
              autoCapitalize="words"
            />
          )}
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            error={emailError}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label={t('auth.phoneForContact')}
            value={phone}
            onChangeText={setPhone}
            error={phoneError}
            hint={t('auth.phoneHint')}
            keyboardType="phone-pad"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry={!passwordVisible}
            accessory={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
                onPress={() => setPasswordVisible((value) => !value)}
                style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
              >
                <Icon
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            }
          />

          <Text style={styles.legalNotice}>
            {t('auth.signUpConsentLead')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(TERMS_URL)}
              style={styles.legalLink}
            >
              {t('auth.openTerms')}
            </Text>
            {' '}{t('auth.roleIntroConsentBetween')}{' '}
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(PRIVACY_URL)}
              style={styles.legalLink}
            >
              {t('auth.openPrivacy')}
            </Text>
          </Text>

          <ErrorBanner error={error} />
          <View style={styles.actions}>
            <Button label={t('auth.signUp')} onPress={() => void submit()} loading={busy} />
          </View>

          <View style={styles.accountSwitch}>
            <Text style={styles.accountPrompt}>{t('auth.existingAccountPrompt')}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={styles.accountLink}>{t('auth.signIn')}</Text>
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
  roleTag: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  barberRoleTag: {
    backgroundColor: colors.accentSoft,
  },
  roleTagText: {
    ...typography.label,
    fontSize: 12,
    color: colors.primary,
  },
  barberRoleTagText: {
    color: colors.accentText,
  },
  legalNotice: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'right',
  },
  legalLink: { color: colors.primary, fontFamily: typography.label.fontFamily },
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
  passwordToggle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space[3],
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  or: {
    ...typography.caption,
    textAlign: 'center',
  },
  accountSwitch: {
    marginTop: space[1],
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[2],
  },
  accountPrompt: {
    ...typography.caption,
  },
  accountLink: {
    ...typography.label,
    color: colors.primary,
  },
  actions: {
    gap: space[3],
  },
});
