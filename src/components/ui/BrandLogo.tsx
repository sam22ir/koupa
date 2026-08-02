import { Image, View, type ImageStyle, type ViewStyle } from 'react-native';

type Variant = 'full' | 'mark';

type Props = {
  readonly variant?: Variant;
  readonly height?: number;
  readonly style?: ViewStyle;
  readonly imageStyle?: ImageStyle;
};

const sources = {
  full: require('../../../assets/brand/logo-512.png'),
  mark: require('../../../assets/brand/logo-mark.png'),
} as const;

/**
 * Koupa brand logo (transparent PNG).
 * - full: mark + KOUPA wordmark
 * - mark: scissors / K symbol only
 */
export function BrandLogo({ variant = 'full', height = 40, style, imageStyle }: Props) {
  const aspect = variant === 'full' ? 512 / 496 : 1;
  const width = Math.round(height * aspect);

  return (
    <View style={[{ width, height }, style]} accessibilityRole="image" accessibilityLabel="كوپا">
      <Image
        source={sources[variant]}
        resizeMode="contain"
        style={[{ width, height }, imageStyle]}
      />
    </View>
  );
}
