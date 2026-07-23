import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '@/src/components/atoms/IconButton';
import { copy } from '@/src/data/copy';
import { colors, spacing, typography } from '@/src/theme';

export interface ScreenHeaderProps { readonly title?: string; readonly onBack?: () => void; readonly actionLabel?: string; readonly onAction?: () => void; }
export function ScreenHeader({ title, onBack, actionLabel, onAction }: ScreenHeaderProps) { return <View style={styles.row}>{onBack ? <IconButton icon="arrow-right" label={copy.common.back} onPress={onBack} /> : <View style={styles.placeholder} />}{title ? <Text style={styles.title}>{title}</Text> : null}{onAction && actionLabel ? <IconButton icon="dots-vertical" label={actionLabel} onPress={onAction} /> : <View style={styles.placeholder} />}</View>; }
const styles = StyleSheet.create({ row: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, placeholder: { width: 44, height: 44 }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'center', flex: 1 } });
