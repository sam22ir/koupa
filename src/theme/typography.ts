import type { TextStyle } from 'react-native';

import { colors } from './colors';
import { fonts } from './fonts';

/**
 * Type scale for Teal Stage using IBM Plex Sans Arabic.
 * Weights use distinct font files (not fontWeight) for reliable Arabic rendering.
 */
export const typography = {
  brand: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 28,
  } satisfies TextStyle,
  display: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 28,
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 24,
  } satisfies TextStyle,
  titleSm: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 18,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 15,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 16,
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 14,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 13,
  } satisfies TextStyle,
  tab: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    fontSize: 12,
  } satisfies TextStyle,
  tabActive: {
    fontFamily: fonts.bold,
    color: colors.primary,
    fontSize: 12,
  } satisfies TextStyle,
  button: {
    fontFamily: fonts.bold,
    color: colors.onPrimary,
    fontSize: 15,
  } satisfies TextStyle,
  chip: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 13,
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
