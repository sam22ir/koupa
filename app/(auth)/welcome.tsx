import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { colors, spacing, typography } from '@/src/theme';

export default function Welcome() {
  return <Screen scroll={false}><View style={styles.brand}><BrandLogo size={132} /></View><View style={styles.content}><Text style={styles.title}>{copy.auth.title}</Text><Text style={styles.subtitle}>{copy.auth.subtitle}</Text></View><View style={styles.actions}><PrimaryButton label={copy.auth.createAccount} onPress={() => router.push('/role')} /><PrimaryButton label={copy.auth.existingAccount} variant="outline" onPress={() => router.push('/sign-in')} /></View></Screen>;
}

const styles = StyleSheet.create({ brand: { alignItems: 'center', marginTop: spacing.xxl }, content: { flex: 1, justifyContent: 'center', gap: spacing.sm }, title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.hero, lineHeight: typography.line.hero, textAlign: 'right' }, subtitle: { color: colors.muted, fontFamily: typography.fontFamily.regular, fontSize: typography.size.label, textAlign: 'right' }, actions: { gap: spacing.md } });
