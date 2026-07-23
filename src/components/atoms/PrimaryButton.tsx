import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface PrimaryButtonProps { readonly label: string; readonly onPress: () => void; readonly disabled?: boolean; readonly loading?: boolean; readonly variant?: 'primary' | 'outline'; }

export function PrimaryButton({ label, onPress, disabled = false, loading = false, variant = 'primary' }: PrimaryButtonProps) {
  const outline = variant === 'outline';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading }} onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.button, outline ? styles.outline : styles.primary, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={outline ? colors.primary : colors.onPrimary} /> : <Text style={[styles.label, outline ? styles.outlineLabel : styles.primaryLabel]}>{label}</Text>}</Pressable>;
}

const styles = StyleSheet.create({ button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.xl, paddingHorizontal: spacing.xl }, primary: { backgroundColor: colors.primary }, outline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82 }, label: { fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label }, primaryLabel: { color: colors.onPrimary }, outlineLabel: { color: colors.primary } });
