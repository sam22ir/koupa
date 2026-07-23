import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { copy } from '@/src/data/copy';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface LocationPreviewProps { readonly hasLocation: boolean; }
export function LocationPreview({ hasLocation }: LocationPreviewProps) { return <View style={styles.preview}><MaterialCommunityIcons name="map-marker" size={30} color={hasLocation ? colors.primary : colors.outline} /><Text style={styles.text}>{copy.barber.location.preview}</Text></View>; }
const styles = StyleSheet.create({ preview: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.outlineVariant, borderRadius: radii.xl, backgroundColor: colors.surfaceMuted, padding: spacing.lg }, text: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.caption, lineHeight: typography.line.caption, textAlign: 'center' } });
