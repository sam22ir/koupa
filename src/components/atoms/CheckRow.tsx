import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface CheckRowProps { readonly label: string; readonly checked: boolean; readonly onChange: (checked: boolean) => void; }
export function CheckRow({ label, checked, onChange }: CheckRowProps) { return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.row}><View style={[styles.box, checked && styles.checked]}>{checked ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}</View><Text style={styles.label}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ row: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: spacing.sm }, box: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, borderRadius: radii.sm, backgroundColor: colors.surface }, checked: { backgroundColor: colors.primary, borderColor: colors.primary }, label: { color: colors.onSurfaceVariant, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, flexShrink: 1, textAlign: 'right' } });
