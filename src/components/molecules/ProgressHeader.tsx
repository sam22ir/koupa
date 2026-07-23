import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme';

export interface ProgressHeaderProps { readonly step: number; readonly title: string; }
export function ProgressHeader({ step, title }: ProgressHeaderProps) { return <View style={styles.wrap}><Text style={styles.step}>الخطوة {step} من 5</Text><Text style={styles.title}>{title}</Text><View style={styles.track}><View style={[styles.fill, { width: `${step * 20}%` }]} /></View></View>; }
const styles = StyleSheet.create({ wrap: { gap: spacing.sm }, step: { color: colors.muted, fontFamily: typography.fontFamily.medium, fontSize: typography.size.caption, textAlign: 'right' }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, lineHeight: typography.line.title, textAlign: 'right' }, track: { height: spacing.sm, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.gold, borderRadius: radii.full } });
