import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/src/theme';

const items = [
  { label: 'الرئيسية', icon: 'home' as const, href: '/(customer)/home' },
  { label: 'البحث', icon: 'magnify' as const, href: '/(customer)/find' },
  { label: 'مواعيدي', icon: 'calendar-month-outline' as const, href: '/(customer)/appointments' },
  { label: 'حسابي', icon: 'account-outline' as const, href: '/(customer)/profile' },
] as const;
export interface CustomerNavigationProps { readonly active: typeof items[number]['label']; }
export function CustomerNavigation({ active }: CustomerNavigationProps) {
  return <View style={styles.navigation}>{items.map((item) => <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active === item.label }} onPress={() => router.replace(item.href)} style={styles.tab}><MaterialCommunityIcons name={item.icon} size={22} color={active === item.label ? colors.primary : colors.outline} /><Text style={[styles.text, active === item.label && styles.selected]}>{item.label}</Text></Pressable>)}</View>;
}
const styles = StyleSheet.create({ navigation: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm }, tab: { minWidth: 56, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, text: { color: colors.outline, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption }, selected: { color: colors.primary, fontFamily: typography.fontFamily.semiBold } });
