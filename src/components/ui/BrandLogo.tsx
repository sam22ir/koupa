import { Image, View, type ImageStyle, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

type Props = {
  readonly height?: number;
  readonly style?: ViewStyle;
  readonly imageStyle?: ImageStyle;
  readonly tinted?: boolean;
};

/** Aspect ratio of the single approved lockup extracted from the welcome logo. */
const intrinsic = { width: 746, height: 777 } as const;
const source = require('../../../assets/brand/logo-lockup-white.png');

/**
 * Koupa brand logo (transparent PNG).
 * The canonical logo is the full scissors / K symbol and KOUPA wordmark from
 * the approved welcome artwork. Its white mask is tinted for the current
 * surface so the same logo is used throughout the app.
 */
export function BrandLogo({
  height = 40,
  style,
  imageStyle,
  tinted = true,
}: Props) {
  const { width: iw, height: ih } = intrinsic;
  const width = Math.round((height * iw) / ih);
  // RN deprecates style.tintColor in favour of the prop.
  const tint = imageStyle?.tintColor ?? (tinted ? colors.primary : undefined);

  return (
    <View style={[{ width, height }, style]} accessibilityRole="image" accessibilityLabel="كوپا">
      <Image
        source={source}
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
