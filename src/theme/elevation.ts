import { Platform, type ViewStyle } from 'react-native';

import { ink, teal } from './colors';

function shadow(color: string, opacity: number, radius: number, y: number, androidElevation: number): ViewStyle {
  if (Platform.OS === 'web') return {};
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: y },
    elevation: androidElevation,
  };
}

/**
 * Three depth levels:
 * - `card`: default raised surface (barber cards, summaries).
 * - `float`: content lifted over the teal stage, sticky bars, sheets.
 * Flat surfaces use a 1px `colors.border` outline instead of a shadow.
 */
export const elevation = {
  none: {} as ViewStyle,
  card: shadow(ink[950], 0.08, 16, 6, 3),
  float: shadow(teal[950], 0.22, 28, 12, 8),
} as const;
