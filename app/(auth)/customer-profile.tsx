import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FormField } from '@/src/components/molecules/FormField';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export interface CustomerProfileProps {}
export default function CustomerProfile(_: CustomerProfileProps) {
  const { session, clearPendingRole } = useSession(); const { createCustomer } = useOnboarding({ userId: session?.user.id }); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (session?.user.phone && !phone) setPhone(session.user.phone); }, [phone, session?.user.phone]);
  const submit = async () => { if (name.trim().length < 2) return setError(copy.common.required); if (!/^(?:\+213|0)(5|6|7)\d{8}$/.test(phone.replace(/[\s-]/g, ''))) return setError(copy.common.invalidPhone); try { setSaving(true); await createCustomer(name.trim(), phone.trim()); await clearPendingRole(); router.replace('/(customer)/home'); } catch { setError(copy.auth.failed); } finally { setSaving(false); } };
  return <Screen><View style={styles.header}><Text style={styles.title}>{copy.customer.title}</Text><Text style={styles.description}>{copy.auth.legalDetail}</Text></View><FormField label={copy.customer.name} value={name} onChangeText={(value) => { setName(value); setError(''); }} error={error && name.trim().length < 2 ? error : undefined} /><FormField label={copy.customer.phone} value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} placeholder={copy.customer.phoneHint} keyboardType="phone-pad" autoComplete="tel" error={error && phone ? error : undefined} /><PrimaryButton label={copy.customer.continue} onPress={submit} loading={saving} /></Screen>;
}
const styles = StyleSheet.create({ header: { marginBottom: spacing.lg, gap: spacing.sm }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, description: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'right' } });
