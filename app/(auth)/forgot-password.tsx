import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { isValidEmail } from '@/src/auth';
import { Button, ErrorBanner, Field, Screen, ScreenTitle } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, typography } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAppSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setMessage('');
    if (!isValidEmail(email)) {
      setError(new Error(t('auth.invalidEmail')));
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setMessage(t('auth.resetSent'));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenTitle title={t('auth.forgotPassword')} />
      <Field
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <ErrorBanner error={error} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button label={t('auth.sendReset')} onPress={() => void submit()} loading={busy} />
      <Button
        label={t('common.back')}
        variant="ghost"
        onPress={() => router.replace('/(auth)/sign-in')}
      />
      <Button
        label={t('auth.signIn')}
        variant="secondary"
        onPress={() => router.replace('/(auth)/sign-in')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'right',
  },
});
