import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { spacing } from '@/src/theme';

export interface OnboardingBrandHeaderProps { readonly compact?: boolean; }

export function OnboardingBrandHeader({ compact = false }: OnboardingBrandHeaderProps) {
  return <View style={styles.wrap}><BrandLogo size={compact ? 44 : 72} /></View>;
}

const styles = StyleSheet.create({ wrap: { alignItems: 'flex-end', marginBottom: spacing.sm } });
