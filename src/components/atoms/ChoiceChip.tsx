import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface ChoiceChipProps { readonly label: string; readonly selected: boolean; readonly onPress: () => void; }
export function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) { return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}><Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ chip: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surface, paddingHorizontal: spacing.lg }, selected: { borderColor: colors.primary, backgroundColor: colors.primary }, pressed: { opacity: 0.8 }, label: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.medium, fontSize: typography.size.body }, selectedLabel: { color: colors.onPrimary } });
