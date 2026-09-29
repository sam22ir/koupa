import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, space, typography } from '@/src/theme';

/** True while a signed-in account still has to confirm its email. */
export function needsEmailConfirmation(input: {
  readonly hasSession: boolean;
  readonly emailConfirmed: boolean;
}): boolean {
  return input.hasSession && !input.emailConfirmed;
}

/**
 * Publish checklist row for the email rule the database enforces. Shows the
 * address the link went to and lets the barber resend it; the confirmation
 * link reopens the app on the barber home, where the checklist ticks itself.
 */
export function EmailConfirmationRow() {
  const { session, emailConfirmed, resendEmailConfirmation } = useAppSession();
  const [note, setNote] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (!needsEmailConfirmation({ hasSession: Boolean(session), emailConfirmed })) return null;
  const email = session?.user.email?.trim() ?? '';

  const resend = async () => {
    setBusy(true);
    setError(null);
    setNote('');
    try {
      await resendEmailConfirmation(email);
      setNote(t('auth.resendSent'));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap} testID="publish-email-row">
      <Text style={styles.line}>{`• ${t('barber.publishNeedsEmail')}`}</Text>
      <Text style={styles.hint}>{t('barber.publishEmailHint')}</Text>
      {email ? <Text style={styles.email}>{email}</Text> : null}
      <ErrorBanner error={error} />
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <Button
        testID="publish-email-resend"
        label={t('auth.resend')}
        variant="secondary"
        loading={busy}
        onPress={() => void resend()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  line: { ...typography.body, textAlign: 'right' },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  email: { ...typography.bodyStrong, color: colors.primary, textAlign: 'right' },
  note: { ...typography.caption, color: colors.primary, textAlign: 'right' },
});
