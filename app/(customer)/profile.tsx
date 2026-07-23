import { StyleSheet, Text, View } from 'react-native';
import { CustomerNavigation } from '@/src/components/molecules/CustomerNavigation';
import { Screen } from '@/src/components/organisms/Screen';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';
export default function CustomerProfile() { const { profile } = useSession(); return <Screen footer={<CustomerNavigation active="حسابي" />}><View style={styles.content}><Text style={styles.title}>حسابي</Text><Text style={styles.name}>{profile?.name}</Text><Text style={styles.meta}>{profile?.phone}</Text></View></Screen>; }
const styles = StyleSheet.create({ content: { flex: 1, gap: spacing.sm }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' }, name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'right' }, meta: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.body, textAlign: 'right' } });
