export { amber, colors, green, ink, palette, red, teal } from './colors';
export type { ColorName, PaletteName } from './colors';

export { elevation } from './elevation';
export { fontFamily, fonts, getFontAssets } from './fonts';
export { layout, space } from './spacing';
export type { SpaceToken } from './spacing';
export { radii } from './radii';
export type { RadiusToken } from './radii';
export { typography } from './typography';
export type { TypographyToken } from './typography';

export { motion } from './motion';

/** Locked visual direction. See DESIGN.md. */
export const designDirection = {
  id: 'koupa-teal',
  name: 'Koupa Teal',
  nameAr: 'تركواز كوپا',
  lockedAt: '2026-09-29',
  principles: [
    'Every color derives from the logo teal #1A7A78; neutrals are teal-tinted ink',
    'Bold teal header on Home, Today, Scan and booking confirmation; paper elsewhere',
    'Amber is the only warm accent: ratings and small highlights',
    'Status colors (green, amber, red) never reuse the brand teal',
    'Rounded shapes: 14 buttons and fields, 18 cards, 24 sheets, pill chips',
    'Arabic-first RTL with IBM Plex Sans Arabic and roomy line heights',
    'Initials only (no photos in MVP)',
  ],
  typeface: 'IBM Plex Sans Arabic',
} as const;
