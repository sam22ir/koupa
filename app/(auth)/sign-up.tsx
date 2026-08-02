import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CredentialMethod, UserRole } from '@/src/auth';
import { isValidEmail, isValidPassword, normalizeAlgerianPhone } from '@/src/auth';
import {
  AuthShell,
  Button,
  CredentialMethodTabs,
  ErrorBanner,
  Field,
  Icon,
} from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { errorCode } from '@/src/services/errors';
import { colors, radii, space, typography } from '@/src/theme';

export default function SignUpScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role === 'barber' || params.role === 'customer')
    ? params.role
    : null;
  const {
    signUpWithPassword,
    retryPhoneRecoveryEmail,
    signInWithGoogle,
    setPendingRole,
    pendingRole,
    loading,
    busy,
  } = useAppSession();
  const [method, setMethod] = useState<CredentialMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);

  useEffect(() => {
    if (!loading && (!role || pendingRole !== role)) {
      router.replace('/(auth)/role');
    }
  }, [loading, pendingRole, role]);

  if (!role) return null;

  const submit = async () => {
    setError(null);
    setRecoveryPending(false);
    setEmailError(undefined);
    setPhoneError(undefined);
    setPasswordError(undefined);
    if (!isValidEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }
    if (!isValidPassword(password)) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    const normalizedPhone = method === 'phone' ? normalizeAlgerianPhone(phone) : undefined;
    if (method === 'phone' && !normalizedPhone) {
      setPhoneError(t('auth.invalidPhone'));
      return;
    }
    try {
      await setPendingRole(role);
      await signUpWithPassword({
        method,
        email: email.trim(),
        phone: normalizedPhone ?? undefined,
        password,
        role,
      });
      router.replace('/(auth)/confirm');
    } catch (caught) {
      setRecoveryPending(errorCode(caught) === 'RECOVERY_EMAIL_ATTACH_FAILED');
      setError(caught);
    }
  };

  const retryRecoveryEmail = async () => {
    if (!retryPhoneRecoveryEmail || method !== 'phone') return;
    setError(null);
    try {
      await retryPhoneRecoveryEmail(email.trim(), role);
      router.replace('/(auth)/confirm');
    } catch (caught) {
      setError(caught);
    }
  };

  const google = async () => {
    setError(null);
    try {
      const result = await signInWithGoogle(role);
      if (result.kind === 'empty') {
        // Most common Expo Go failure: redirect URL not allow-listed in Supabase,
        // so the browser never returns a callback URL to the app.
        setError(new Error(t('auth.googleCancelled')));
        return;
      }
      if (result.kind === 'recovery') {
        router.replace('/(auth)/reset-password');
        return;
      }
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
    <AuthShell title={t('auth.signUp')} subtitle={subtitle} backHref="/(auth)/role">
      <View testID="sign-up-role-badge" style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{roleLabel}</Text>
      </View>

      <CredentialMethodTabs
        value={method}
        emailLabel={t('auth.methodEmail')}
        phoneLabel={t('auth.methodPhone')}
        onChange={(value) => {
          setMethod(value);
          setEmailError(undefined);
          setPhoneError(undefined);
          setPasswordError(undefined);
          setError(null);
        }}
      />

      {method === 'phone' ? (
        <Field
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          error={phoneError}
          keyboardType="phone-pad"
        />
      ) : null}
      <Field
        label={method === 'phone' ? t('auth.recoveryEmail') : t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        keyboardType="email-address"
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

      <ErrorBanner error={error} />
      {recoveryPending ? (
        <Button
          label={t('common.retry')}
          variant="secondary"
          onPress={() => void retryRecoveryEmail()}
          loading={busy}
        />
      ) : null}
      <Button label={t('auth.signUp')} onPress={() => void submit()} loading={busy} />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.or}>{t('auth.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <Button
        label={t('auth.google')}
        variant="secondary"
        onPress={() => void google()}
        disabled={busy}
      />

      <View style={styles.accountSwitch}>
        <Text style={styles.accountPrompt}>{t('auth.existingAccountPrompt')}</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.accountLink}>{t('auth.signIn')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  roleBadgeText: {
    ...typography.label,
    color: colors.primary,
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
});
