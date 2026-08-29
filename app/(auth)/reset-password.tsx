import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { isValidPassword } from '@/src/auth';
import { AuthShell, Button, ErrorBanner, Field, Icon } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, typography } from '@/src/theme';

export default function ResetPasswordScreen() {
  const { updatePassword, session, signOut } = useAppSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const submit = async () => {
    setError(null);
    if (!isValidPassword(password)) {
      setError(new Error(t('auth.passwordTooShort')));
      return;
    }
    if (password !== confirm) {
      setError(new Error(t('auth.passwordMismatch')));
      return;
    }
    if (!session) {
      setError(new Error(t('auth.linkExpiredBody')));
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const switchToSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordDone')} showBack={false}>
        <Button label={t('auth.goHome')} onPress={() => router.replace('/')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordBody')} showBack={false}>
      <Field
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!passwordVisible}
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
            onPress={() => setPasswordVisible((value) => !value)}
          >
            <Icon name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <Field
        label={t('auth.passwordConfirm')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!confirmVisible}
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmVisible ? t('auth.hidePassword') : t('auth.showPassword')}
            onPress={() => setConfirmVisible((value) => !value)}
          >
            <Icon name={confirmVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <ErrorBanner error={error} />
      {!session ? (
        <Text style={styles.hint}>{t('auth.linkExpiredBody')}</Text>
      ) : null}
      <Button
        label={t('auth.resetPasswordSave')}
        onPress={() => void submit()}
        loading={busy}
        disabled={!session}
      />
      <Button
        label={t('auth.signIn')}
        variant="secondary"
        disabled={busy}
        onPress={() => void switchToSignIn()}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
});
