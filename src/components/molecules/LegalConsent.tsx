import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckRow } from '@/src/components/atoms/CheckRow';
import { copy } from '@/src/data/copy';
import { colors, spacing, typography } from '@/src/theme';

export interface LegalConsentProps { readonly accepted: boolean; readonly onChange: (accepted: boolean) => void; }

const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL;
const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;

export function LegalConsent({ accepted, onChange }: LegalConsentProps) {
  return <View style={styles.wrap}><CheckRow label={copy.auth.legal} checked={accepted} onChange={onChange} /><View style={styles.links}>{termsUrl ? <Pressable accessibilityRole="link" accessibilityLabel="الشروط" onPress={() => void Linking.openURL(termsUrl)}><Text style={styles.link}>الشروط</Text></Pressable> : null}{privacyUrl ? <Pressable accessibilityRole="link" accessibilityLabel="سياسة الخصوصية" onPress={() => void Linking.openURL(privacyUrl)}><Text style={styles.link}>سياسة الخصوصية</Text></Pressable> : null}</View></View>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.xs }, links: { flexDirection: 'row-reverse', gap: spacing.md }, link: { color: colors.primary, fontFamily: typography.fontFamily.medium, fontSize: typography.size.caption } });
