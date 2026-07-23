import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { FormField } from '@/src/components/molecules/FormField';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function EmailConfirmation() {
  const { expired } = useLocalSearchParams<{ expired?: string }>();
  const { session, emailConfirmed, legalError, pendingConfirmationEmail, resendEmailConfirmation } = useSession();
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (pendingConfirmationEmail) setEmail(pendingConfirmationEmail); }, [pendingConfirmationEmail]);
  useEffect(() => { if (session && emailConfirmed && !legalError) router.replace('/'); }, [emailConfirmed, legalError, session]);
  const resend = async () => { try { setLoading(true); setMessage(''); await resendEmailConfirmation(email); setMessage(copy.auth.linkResent); } catch { setMessage(copy.auth.failed); } finally { setLoading(false); } };
  return <Screen scroll={false}><View style={styles.brand}><BrandLogo size={112} /></View><View style={styles.content}><Text style={styles.title}>{copy.auth.confirmationTitle}</Text><Text style={styles.body}>{legalError ?? (expired === '1' ? copy.auth.expiredLink : copy.auth.confirmationBody)}</Text><FormField label={copy.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" />{message ? <Text style={styles.message}>{message}</Text> : null}</View><View style={styles.actions}><PrimaryButton label={copy.auth.resend} onPress={() => void resend()} loading={loading} /><PrimaryButton label={copy.auth.existingAccount} variant="outline" onPress={() => router.replace('/sign-in')} /><PrimaryButton label={copy.common.back} variant="outline" onPress={() => router.replace('/welcome')} /></View></Screen>;
}

const styles = StyleSheet.create({ brand: { alignItems: 'center', marginTop: spacing.xxl }, content: { flex: 1, justifyContent: 'center', gap: spacing.md }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'right' }, message: { color: colors.primary, fontFamily: typography.fontFamily.regular, textAlign: 'right' }, actions: { gap: spacing.sm } });
