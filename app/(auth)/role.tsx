import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import type { UserRole } from '@/src/data/onboarding';
import { colors, radii, spacing, typography } from '@/src/theme';
import { useState } from 'react';

export interface RoleProps {}
export default function Role(_: RoleProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const continueToRegistration = () => { if (selectedRole) router.push({ pathname: '/(auth)/register', params: { role: selectedRole } }); };
  return <Screen><BrandLogo /><View style={styles.intro}><Text style={styles.title}>{copy.roles.title}</Text></View><RoleCard label={copy.roles.customer} hint={copy.roles.customerHint} icon="account" selected={selectedRole === 'customer'} onPress={() => setSelectedRole('customer')} /><RoleCard label={copy.roles.barber} hint={copy.roles.barberHint} icon="content-cut" selected={selectedRole === 'barber'} onPress={() => setSelectedRole('barber')} /><View style={styles.footer}><PrimaryButton label={copy.roles.continue} disabled={!selectedRole} onPress={continueToRegistration} /></View></Screen>;
}
export interface RoleCardProps { readonly label: string; readonly hint: string; readonly icon: keyof typeof MaterialCommunityIcons.glyphMap; readonly selected: boolean; readonly onPress: () => void; }
function RoleCard({ label, hint, icon, selected, onPress }: RoleCardProps) { return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}><View style={styles.cardTop}><View style={[styles.icon, selected && styles.selectedIcon]}><MaterialCommunityIcons name={icon} size={26} color={selected ? colors.onPrimary : colors.primary} /></View><View style={[styles.check, selected && styles.selectedCheck]}>{selected ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}</View></View><Text style={[styles.cardTitle, selected && styles.selectedText]}>{label}</Text><Text style={[styles.hint, selected && styles.selectedText]}>{hint}</Text></Pressable>; }
const styles = StyleSheet.create({ intro: { marginTop: spacing.xl }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.sm }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, pressed: { opacity: 0.8 }, cardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, icon: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radii.xl, backgroundColor: colors.surfaceMuted }, selectedIcon: { backgroundColor: colors.gold }, check: { width: 24, height: 24, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' }, selectedCheck: { borderColor: colors.onPrimary, backgroundColor: colors.gold }, cardTitle: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' }, hint: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, lineHeight: typography.line.body, textAlign: 'right' }, selectedText: { color: colors.onPrimary }, footer: { marginTop: 'auto' } });
