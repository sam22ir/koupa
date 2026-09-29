import type { TextStyle } from 'react-native';

import { colors } from './colors';
import { fonts } from './fonts';

/**
 * Koupa Teal type scale, IBM Plex Sans Arabic.
 * Weights use distinct font files (not fontWeight) for reliable Arabic rendering.
 * Line heights are ~1.4–1.6× so Arabic marks and descenders never collide.
 */
export const typography = {
  brand: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 28,
    lineHeight: 40,
  } satisfies TextStyle,
  display: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 30,
    lineHeight: 42,
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 24,
    lineHeight: 34,
  } satisfies TextStyle,
  titleSm: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 18,
    lineHeight: 28,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.regular,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fonts.semiBold,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  } satisfies TextStyle,
  /** Times, prices and counts: lining, same-width digits. */
  numeric: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  tab: {
    fontFamily: fonts.medium,
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16,
  } satisfies TextStyle,
  tabActive: {
    fontFamily: fonts.semiBold,
    color: colors.primarySoftText,
    fontSize: 11,
    lineHeight: 16,
  } satisfies TextStyle,
  button: {
    fontFamily: fonts.semiBold,
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 22,
  } satisfies TextStyle,
  chip: {
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
