import { Image, View, type ImageStyle, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

type Variant = 'full' | 'mark';

type Props = {
  readonly variant?: Variant;
  readonly height?: number;
  readonly style?: ViewStyle;
  readonly imageStyle?: ImageStyle;
  readonly tinted?: boolean;
};

/** Artwork intrinsic sizes in px — the box is derived from these, never guessed. */
const intrinsic = {
  full: { width: 497, height: 512 },
  mark: { width: 512, height: 512 },
} as const;

const sources = {
  full: require('../../../assets/brand/logo-512.png'),
  mark: require('../../../assets/brand/logo-mark.png'),
} as const;

/**
 * Koupa brand logo (transparent PNG).
 * - full: scissors / K symbol + كوپا wordmark — the canonical lockup
 * - mark: symbol only
 *
 * The brand colour is the teal used by the auth header: the artwork is
 * flattened to `colors.primary` so every screen shows the same mark. Pass
 * `tinted={false}` only where the raw multi-colour artwork is wanted.
 */
export function BrandLogo({
  variant = 'full',
  height = 40,
  style,
  imageStyle,
  tinted = true,
}: Props) {
  const { width: iw, height: ih } = intrinsic[variant];
  const width = Math.round((height * iw) / ih);
  // RN deprecates style.tintColor in favour of the prop.
  const tint = imageStyle?.tintColor ?? (tinted ? colors.primary : undefined);

  return (
    <View style={[{ width, height }, style]} accessibilityRole="image" accessibilityLabel="كوپا">
      <Image
        source={sources[variant]}
        resizeMode="contain"
        tintColor={tint}
        style={[
          { width, height },
          tint ? { opacity: 0.96 } : null,
          { ...imageStyle, tintColor: undefined },
        ]}
      />
    </View>
  );
}
