import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  isGoogleCollisionMessage,
  isValidEmail,
  isValidSignInPassword,
  normalizeAlgerianPhone,
  type CredentialMethod,
} from '@/src/auth';
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
import { colors, space, typography } from '@/src/theme';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ collision?: string }>();
  const { signInWithPassword, signInWithPhone, signInWithGoogle, linkGoogleIdentity, busy } = useAppSession();
  const [method, setMethod] = useState<CredentialMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [linkGoogleAfterPassword, setLinkGoogleAfterPassword] = useState(false);

  const collisionBanner = useMemo(
    () => (params.collision === '1' ? t('auth.collisionBody') : null),
    [params.collision],
  );

  const submit = async () => {
    setError(null);
    setIdentifierError(undefined);
    setPasswordError(undefined);
    const normalizedPhone = method === 'phone' ? normalizeAlgerianPhone(identifier) : null;
    if (method === 'email' && !isValidEmail(identifier)) {
      setIdentifierError(t('auth.invalidEmail'));
      return;
    }
    if (method === 'phone' && !normalizedPhone) {
      setIdentifierError(t('auth.invalidPhone'));
      return;
    }
    if (!isValidSignInPassword(password, method === 'email' ? identifier : normalizedPhone ?? '')) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    try {
      if (method === 'phone') {
        await signInWithPhone(normalizedPhone!, password);
      } else {
        await signInWithPassword(identifier.trim(), password);
      }
      if (linkGoogleAfterPassword || params.collision === '1') {
        const result = await linkGoogleIdentity();
        if (result.kind === 'empty') {
          setError(new Error(t('auth.googleCancelled')));
          return;
        }
      }
      router.replace('/');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught ?? '');
      const cause =
        caught instanceof Error && 'cause' in caught && caught.cause instanceof Error
          ? caught.cause.message
          : '';
      if (isGoogleCollisionMessage(`${message} ${cause}`)) {
        setLinkGoogleAfterPassword(true);
      }
      if (method === 'email' && /email not confirmed/i.test(`${message} ${cause}`)) {
        router.replace({
          pathname: '/(auth)/confirm',
          params: { email: identifier.trim() },
        });
        return;
      }
      setError(caught);
    }
  };

  const google = async () => {
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.kind === 'empty') {
        // The Supabase redirect-URL reminder belongs in the Metro log, which
        // src/services/auth.ts already prints, not in a user-facing error.
        if (__DEV__) {
          console.warn('[auth] Google sign-in cancelled. Check the Supabase redirect URL.');
        }
        setError(new Error(t('auth.googleCancelled')));
        return;
      }
      if (result.kind === 'recovery') {
        router.replace('/(auth)/reset-password');
        return;
      }
      router.replace('/');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught ?? '');
      const cause =
        caught instanceof Error && 'cause' in caught && caught.cause instanceof Error
          ? caught.cause.message
          : '';
      if (isGoogleCollisionMessage(`${message} ${cause}`)) {
        setLinkGoogleAfterPassword(true);
      }
      setError(caught);
    }
  };

  return (
    <AuthShell title={t('auth.signIn')} subtitle={t('auth.signInSubtitle')}>
      {collisionBanner ? (
        <View style={styles.notice}>
          {/* Gold as a spine, never as a fill. */}
          <View style={styles.noticeSpine} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{t('auth.collisionTitle')}</Text>
            <Text style={styles.noticeBody}>{collisionBanner}</Text>
          </View>
        </View>
      ) : null}

      <CredentialMethodTabs
        value={method}
        emailLabel={t('auth.methodEmail')}
        phoneLabel={t('auth.methodPhone')}
        onChange={(value) => {
          setMethod(value);
          setIdentifier('');
          setIdentifierError(undefined);
          setPasswordError(undefined);
          setPasswordVisible(false);
          setLinkGoogleAfterPassword(false);
          setError(null);
        }}
      />

      <Field
        label={method === 'email' ? t('auth.email') : t('auth.phone')}
        value={identifier}
        onChangeText={setIdentifier}
        error={identifierError}
        autoCapitalize="none"
        keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
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

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('auth.forgotPassword')}
        onPress={() => router.push('/(auth)/forgot-password')}
        style={({ pressed }) => [styles.forgotHit, pressed && styles.pressed]}
      >
        <Text style={styles.forgot}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <ErrorBanner error={error} />
      <Button label={t('auth.signIn')} onPress={() => void submit()} loading={busy} />

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
        <Text style={styles.accountPrompt}>{t('auth.noAccount')}</Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/welcome')}>
          <Text style={styles.accountLink}>{t('auth.createAccount')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row-reverse',
    gap: space[3],
  },
  noticeSpine: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  noticeCopy: {
    flex: 1,
    gap: space[1],
  },
  noticeTitle: {
    ...typography.label,
    color: colors.text,
    textAlign: 'right',
  },
  noticeBody: {
    ...typography.caption,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
  },
  forgot: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'left',
  },
  forgotHit: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  passwordToggle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
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
