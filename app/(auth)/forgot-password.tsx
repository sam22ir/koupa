import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { isValidEmail } from '@/src/auth';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { FormField } from '@/src/components/molecules/FormField';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function ForgotPassword() {
  const { requestPasswordReset } = useSession(); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => { if (!isValidEmail(email)) return; try { setLoading(true); await requestPasswordReset(email.trim()); } finally { setLoading(false); setMessage(copy.auth.resetSent); } };
  return <Screen><View style={styles.header}><Text style={styles.title}>{copy.auth.resetPassword}</Text><Text style={styles.body}>{copy.auth.recoveryEmail}</Text></View><FormField label={copy.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" />{message ? <Text style={styles.message}>{message}</Text> : null}<View style={styles.footer}><PrimaryButton label={copy.auth.sendReset} onPress={() => void submit()} loading={loading} /></View></Screen>;
}

const styles = StyleSheet.create({ header: { gap: spacing.xs }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' }, message: { color: colors.primary, fontFamily: typography.fontFamily.regular, textAlign: 'right' }, footer: { marginTop: 'auto' } });
