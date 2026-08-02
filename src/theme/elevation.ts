import { Platform, type ViewStyle } from 'react-native';

import { colors } from './colors';

const nativeCard: ViewStyle = {
  shadowColor: colors.text,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

/** Floating card elevation used when content overlaps the teal stage. */
export const elevation = {
  none: {} as ViewStyle,
  card: Platform.OS === 'web' ? ({} as ViewStyle) : nativeCard,
} as const;
