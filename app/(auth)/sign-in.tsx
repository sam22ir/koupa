import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  isGoogleCollisionMessage,
  isValidEmail,
  isValidSignInPassword,
} from '@/src/auth';
import {
  AuthShell,
  Button,
  ErrorBanner,
  Field,
  Icon,
} from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, space, typography } from '@/src/theme';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ collision?: string }>();
  const { signInWithPassword, signInWithGoogle, linkGoogleIdentity, busy } = useAppSession();
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
    if (!isValidEmail(identifier)) {
      setIdentifierError(t('auth.invalidEmail'));
      return;
    }
    if (!isValidSignInPassword(password, identifier)) {
      setPasswordError(t('auth.passwordTooShort'));
      return;
    }
    try {
      await signInWithPassword(
        identifier.trim(),
        password,
      );
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
      if (/email not confirmed/i.test(`${message} ${cause}`)) {
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
        setError(
          new Error(
            `${t('auth.googleCancelled')} — check Metro log for "ADD THIS EXACT URL TO SUPABASE REDIRECT URLS" and add it in Supabase Auth → URL Configuration.`,
          ),
        );
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
        <View style={styles.infoBanner}>
          <Text style={styles.infoTitle}>{t('auth.collisionTitle')}</Text>
          <Text style={styles.infoBody}>{collisionBanner}</Text>
        </View>
      ) : null}

      <Field
        label={t('auth.email')}
        value={identifier}
        onChangeText={setIdentifier}
        error={identifierError}
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

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/(auth)/forgot-password')}
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
        <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/role')}>
          <Text style={styles.accountLink}>{t('auth.createAccount')}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: space[3],
    gap: space[1],
  },
  infoTitle: {
    ...typography.label,
    color: colors.accentText,
    textAlign: 'right',
  },
  infoBody: {
    ...typography.caption,
    color: colors.accentText,
    textAlign: 'right',
  },
  forgot: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'left',
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
