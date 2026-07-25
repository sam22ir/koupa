import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { barberNavigation } from '@/src/data/copy';
import { colors, spacing, typography } from '@/src/theme';

const items = [
  { label: barberNavigation[0], icon: 'calendar-today' as const, href: '/(barber)/home' },
  { label: barberNavigation[1], icon: 'calendar-clock' as const, href: '/(barber)/schedule' },
  { label: barberNavigation[2], icon: 'storefront-outline' as const, href: '/(barber)/shop' },
  { label: barberNavigation[3], icon: 'account-outline' as const, href: '/(barber)/profile' },
] as const;

export interface BarberNavigationProps {
  readonly active: (typeof items)[number]['label'];
}

export function BarberNavigation({ active }: BarberNavigationProps) {
  return (
    <View style={styles.navigation}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active === item.label }}
          onPress={() => router.replace(item.href)}
          style={styles.tab}
        >
          <MaterialCommunityIcons name={item.icon} size={22} color={active === item.label ? colors.primary : colors.outline} />
          <Text style={[styles.text, active === item.label && styles.selected]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
  },
  tab: { minWidth: 56, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  text: { color: colors.outline, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption },
  selected: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
});
