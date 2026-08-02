export { colors, palette } from './colors';
export type { ColorName, PaletteName } from './colors';

export { elevation } from './elevation';
export { fontFamily, fonts, getFontAssets } from './fonts';
export { layout, space } from './spacing';
export type { SpaceToken } from './spacing';
export { radii } from './radii';
export type { RadiusToken } from './radii';
export { typography } from './typography';
export type { TypographyToken } from './typography';

/** Locked visual direction for the frontend rebuild. */
export const designDirection = {
  id: 'teal-stage',
  name: 'Teal Stage',
  nameAr: 'منصة التركواز',
  lockedAt: '2026-07-28',
  principles: [
    'Deep teal owns primary stage/hero surfaces',
    'Warm gold is accent only (bar, status, secondary marks)',
    'Floating white cards can overlap the teal stage',
    'Soft radii (16–22) and light elevation on hero cards',
    'Arabic-first RTL with IBM Plex Sans Arabic',
    'Initials only (no photos in MVP)',
  ],
  typeface: 'IBM Plex Sans Arabic',
} as const;
