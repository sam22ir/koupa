import { Image, StyleSheet, View } from 'react-native';

export interface BrandLogoProps { readonly size?: number; }

export function BrandLogo({ size = 96 }: BrandLogoProps) {
  return <View style={styles.wrap}><Image accessibilityLabel="Koupa logo" source={require('../../../assets/koupa-wordmark.png')} style={[styles.logo, { width: size, height: size }]} resizeMode="contain" /></View>;
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center' }, logo: { aspectRatio: 1 } });
