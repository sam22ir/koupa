import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, ErrorBanner, Field, Screen, ScreenTitle } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, typography } from '@/src/theme';

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    pendingConfirmationEmail,
    resendEmailConfirmation,
    signOut,
    session,
    emailConfirmed,
  } = useAppSession();
  const accountEmail = session?.user.email?.trim() ?? '';
  const routeEmail = typeof params.email === 'string' ? params.email.trim() : '';
  const authoritativeEmail = accountEmail || pendingConfirmationEmail || routeEmail;
  const [email, setEmail] = useState('');
  const displayedEmail = authoritativeEmail || email;
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // If the user confirmed via deep link while this screen is open, leave.
  useEffect(() => {
    if (session && emailConfirmed) {
      router.replace('/');
    }
  }, [emailConfirmed, session]);

  const resend = async () => {
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await resendEmailConfirmation(displayedEmail.trim());
      setMessage(t('auth.resendSent'));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenTitle title={t('auth.confirmTitle')} subtitle={t('auth.confirmBody')} />
      <Text style={styles.email}>{displayedEmail}</Text>
      <Text style={styles.hint}>{t('auth.confirmHint')}</Text>
      <Field
        label={t('auth.email')}
        value={displayedEmail}
        onChangeText={setEmail}
        editable={!accountEmail && !pendingConfirmationEmail && !routeEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <ErrorBanner error={error} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button label={t('auth.resend')} onPress={() => void resend()} loading={busy} />
      <Button
        label={t('auth.signIn')}
        variant="secondary"
        onPress={() => router.replace('/(auth)/sign-in')}
      />
      <Button
        label={t('common.logout')}
        variant="ghost"
        onPress={() => {
          void signOut().then(() => router.replace('/(auth)/welcome'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: {
    ...typography.bodyStrong,
    color: colors.primary,
    textAlign: 'right',
  },
  hint: {
    ...typography.caption,
    textAlign: 'right',
  },
  message: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'right',
  },
});
