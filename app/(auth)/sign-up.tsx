import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isValidEmail, isValidPassword, normalizeAlgerianPhone } from '@/src/auth';
import {
  AuthShell,
  Button,
  ErrorBanner,
  Field,
  Icon,
} from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, radii, space, typography } from '@/src/theme';

export default function SignUpScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role === 'barber' || params.role === 'customer')
    ? params.role
    : null;
  const {
    signUpWithPassword,
    signInWithGoogle,
    setPendingRole,
    pendingRole,
    loading,
    busy,
  } = useAppSession();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);

  // Barber-only: shop details
  const isBarber = role === 'barber';
  const [shopName, setShopName] = useState('');
  const [shopSkipped, setShopSkipped] = useState(false);

  useEffect(() => {
    if (!loading && (!role || pendingRole !== role)) {
      router.replace('/(auth)/welcome');
    }
  }, [loading, pendingRole, role]);

  if (!role) return null;

  const submit = async () => {
    setError(null);
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

  const shopNote = t('shopWorkspace.shopVisibilityNote');

  return (
    <AuthShell
      title={t('auth.signUp')}
      subtitle={subtitle}
      kicker={roleLabel}
      backHref="/(auth)/role-intro"
    >

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

      {/* ── Barber: shop details ── */}
      {isBarber ? (
        <View style={styles.shopSection}>
          <Text style={styles.shopSectionTitle}>{t('shopWorkspace.shopInfo')}</Text>

          {shopSkipped ? (
            <View style={styles.shopSkippedNote}>
              <Icon name="information-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.shopSkippedText}>{shopNote}</Text>
              <Button
                label={t('common.edit')}
                variant="ghost"
                onPress={() => setShopSkipped(false)}
              />
            </View>
          ) : (
            <>
              <Field
                label={t('shopWorkspace.shopNameField')}
                value={shopName}
                onChangeText={setShopName}
                placeholder={t('shopWorkspace.shopNamePlaceholder')}
              />

              {/* Join shop hint */}
              <Text style={styles.joinHint}>
                {t('shopWorkspace.joinShopHint')}
              </Text>

              <Button
                label={t('shopWorkspace.skipShop')}
                variant="ghost"
                onPress={() => setShopSkipped(true)}
              />
            </>
          )}
        </View>
      ) : null}

      <ErrorBanner error={error} />
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
  // ── Shop section (barber only) ──
  shopSection: {
    gap: space[3],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shopSectionTitle: {
    ...typography.titleSm,
    fontSize: 18,
    textAlign: 'right',
    color: colors.text,
  },
  joinHint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },
  shopSkippedNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: space[3],
  },
  shopSkippedText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.accentText,
    flex: 1,
    lineHeight: 18,
    textAlign: 'right',
  },
});