/**
 * Koupa brand palette + semantic colors.
 * Design direction: Teal Stage (locked 2026-07-28).
 */
export const palette = {
  teal: '#1A7A78',
  warmGold: '#E1A553',
  charcoalBlue: '#323E4B',
  offWhite: '#F3F5F7',
} as const;

export const colors = {
  // Brand roles
  primary: palette.teal,
  accent: palette.warmGold,
  text: palette.charcoalBlue,
  background: palette.offWhite,

  // Surfaces
  surface: '#FFFFFF',
  surfaceMuted: '#E8EEF0',
  /** Tinted operations canvas behind floating cards and editors. */
  workspace: '#DCE9EA',
  stage: palette.teal,
  stageDecor: 'rgba(255,255,255,0.08)',
  stageOverlay: 'rgba(255,255,255,0.14)',

  // Text
  textMuted: '#6B7680',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(243,245,247,0.86)',
  onAccent: palette.charcoalBlue,
  accentText: '#8A5A18',

  // Borders & fills
  border: '#D8DEE4',
  primarySoft: '#E4F3F2',
  accentSoft: '#FBF1E1',

  // Feedback
  danger: '#C0392B',
  dangerSoft: '#FDECEA',
  success: palette.teal,
  successSoft: '#E4F3F2',
} as const;

export type PaletteName = keyof typeof palette;
export type ColorName = keyof typeof colors;
