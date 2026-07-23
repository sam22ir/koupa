import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { isValidEmail, isValidPassword, normalizeAlgerianPhone, type CredentialMethod, type UserRole } from '@/src/auth';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { LegalConsent } from '@/src/components/molecules/LegalConsent';
import { FormField } from '@/src/components/molecules/FormField';
import { MethodSwitch } from '@/app/(auth)/sign-in';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function Register() {
  const { role } = useLocalSearchParams<{ role?: UserRole }>(); const selectedRole = role === 'customer' || role === 'barber' ? role : null;
  const { signInWithGoogle, signUpWithPassword, setPendingRole } = useSession();
  const [method, setMethod] = useState<CredentialMethod>('email'); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [accepted, setAccepted] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const continueWithPassword = async () => { if (!selectedRole) return router.replace('/role'); const normalizedPhone = method === 'phone' ? normalizeAlgerianPhone(phone) : undefined; if (!accepted || !isValidEmail(email) || !isValidPassword(password) || (method === 'phone' && !normalizedPhone)) return setError(copy.common.validation); try { setLoading(true); setError(''); await setPendingRole(selectedRole); await signUpWithPassword({ method, email: email.trim(), phone: normalizedPhone ?? undefined, password, role: selectedRole }); router.replace('/email-confirmation'); } catch { setError(copy.auth.failed); } finally { setLoading(false); } };
  const google = async () => { if (!selectedRole || !accepted) return setError(copy.common.validation); try { setLoading(true); setError(''); await signInWithGoogle(selectedRole); router.replace('/'); } catch { setError(copy.auth.failed); } finally { setLoading(false); } };
  return <Screen><View style={styles.brand}><BrandLogo size={96} /></View><View style={styles.header}><Text style={styles.title}>{copy.auth.createTitle}</Text><Text style={styles.subtitle}>{copy.auth.chooseMethod}</Text></View><LegalConsent accepted={accepted} onChange={setAccepted} /><PrimaryButton label={copy.auth.google} variant="outline" disabled={!accepted} onPress={() => void google()} loading={loading} /><MethodSwitch method={method} onChange={setMethod} />{method === 'phone' ? <FormField label={copy.auth.phone} value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} keyboardType="phone-pad" autoComplete="tel" autoCapitalize="none" /> : null}<FormField label={method === 'phone' ? copy.auth.recoveryEmail : copy.auth.email} value={email} onChangeText={(value) => { setEmail(value); setError(''); }} keyboardType="email-address" autoComplete="email" autoCapitalize="none" /><FormField label={copy.auth.password} placeholder={copy.auth.passwordHint} value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry autoComplete="new-password" autoCapitalize="none" />{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.footer}><PrimaryButton label={copy.auth.createAccount} onPress={() => void continueWithPassword()} loading={loading} /></View></Screen>;
}

const styles = StyleSheet.create({ brand: { alignItems: 'center' }, header: { gap: spacing.xs }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' }, footer: { marginTop: 'auto' } });
