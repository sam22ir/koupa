import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { isValidPassword } from '@/src/auth';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { FormField } from '@/src/components/molecules/FormField';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function ResetPassword() {
  const { session } = useSession(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => { if (!session || !isValidPassword(password)) return setError(copy.common.validation); try { setLoading(true); const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) throw updateError; router.replace('/'); } catch { setError(copy.auth.failed); } finally { setLoading(false); } };
  return <Screen><View style={styles.header}><Text style={styles.title}>{copy.auth.resetPassword}</Text><Text style={styles.body}>{copy.auth.passwordHint}</Text></View><FormField label={copy.auth.password} value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry autoComplete="new-password" autoCapitalize="none" />{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.footer}><PrimaryButton label={copy.auth.resetPassword} onPress={() => void submit()} loading={loading} /></View></Screen>;
}

const styles = StyleSheet.create({ header: { gap: spacing.xs }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, body: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' }, footer: { marginTop: 'auto' } });
