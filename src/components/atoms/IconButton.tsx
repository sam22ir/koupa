import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/src/theme';

export interface IconButtonProps { readonly icon: keyof typeof MaterialCommunityIcons.glyphMap; readonly label: string; readonly onPress: () => void; readonly tone?: 'primary' | 'default' | 'danger'; readonly disabled?: boolean; }

export function IconButton({ icon, label, onPress, tone = 'default', disabled = false }: IconButtonProps) {
  const color = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.onSurfaceVariant;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}><MaterialCommunityIcons name={icon} size={22} color={color} /></Pressable>;
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full, padding: spacing.sm }, pressed: { backgroundColor: colors.surfaceMuted }, disabled: { opacity: 0.45 } });
