import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme';

export interface ScreenProps { readonly children: ReactNode; readonly scroll?: boolean; readonly footer?: ReactNode; }
export function Screen({ children, scroll = true, footer }: ScreenProps) {
  return <SafeAreaView style={styles.safe}>
    {scroll ? <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={styles.body}><View style={styles.content}>{children}</View></View>}
    {footer ? <View style={styles.footer}>{footer}</View> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, body: { flex: 1 }, content: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl }, footer: { flexShrink: 0 } });
