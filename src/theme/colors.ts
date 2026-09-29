/**
 * Koupa Teal palette + semantic colors.
 * Every hue is derived from the logo teal (#1A7A78 = teal[600]). Neutrals carry
 * a slight teal tint; amber is the one warm accent (ratings, small highlights).
 * Keep `global.css` (HeroUI variables) in sync when these values change.
 */
export const teal = {
  50: '#EDF7F6',
  100: '#D3EEEC',
  200: '#A9DCD9',
  300: '#74C3BF',
  400: '#3FA6A2',
  500: '#238D8A',
  600: '#1A7A78',
  700: '#156563',
  800: '#11504F',
  900: '#0D3D3C',
  950: '#072827',
} as const;

export const ink = {
  0: '#FFFFFF',
  25: '#F8FAFA',
  50: '#F4F7F7',
  100: '#E7EDED',
  200: '#D6DFDF',
  300: '#B9C5C5',
  400: '#8D9C9C',
  500: '#5F6E6E',
  600: '#4B5959',
  700: '#354242',
  800: '#232F2F',
  900: '#152121',
  950: '#0B1515',
} as const;

export const amber = {
  50: '#FEF4E2',
  400: '#F2B53A',
  500: '#E39A12',
  700: '#8A5605',
} as const;

export const green = {
  50: '#E8F6EE',
  600: '#1E9A5E',
  700: '#14774A',
} as const;

export const red = {
  50: '#FDEEEC',
  200: '#F4C7C3',
  600: '#C93A32',
  700: '#B5302A',
} as const;

export const palette = {
  teal: teal[600],
  amber: amber[400],
  ink: ink[900],
  canvas: ink[50],
} as const;

export const colors = {
  // Brand roles
  primary: teal[600],
  primaryPressed: teal[700],
  accent: amber[400],
  text: ink[900],
  background: ink[50],

  // Surfaces
  surface: ink[0],
  surfaceMuted: ink[100],
  /** Tinted operations canvas behind floating cards and editors. */
  workspace: teal[50],
  stage: teal[600],
  stageDecor: 'rgba(255,255,255,0.08)',
  stageOverlay: 'rgba(255,255,255,0.14)',
  stageBorder: 'rgba(255,255,255,0.28)',

  // Text
  textMuted: ink[500],
  textSubtle: ink[400],
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255,255,255,0.82)',
  onAccent: ink[900],
  accentText: amber[700],
  primarySoftText: teal[700],

  // Borders & fills
  border: ink[200],
  borderSubtle: ink[100],
  primarySoft: teal[50],
  accentSoft: amber[50],

  // Feedback — status never reuses the brand teal.
  danger: red[700],
  dangerSoft: red[50],
  dangerBorder: red[200],
  success: green[700],
  successSoft: green[50],
  warning: amber[700],
  warningSoft: amber[50],
  info: teal[700],
  infoSoft: teal[50],

  // Overlays
  scrim: 'rgba(11,21,21,0.48)',
  scrimStrong: 'rgba(11,21,21,0.72)',
} as const;

export type PaletteName = keyof typeof palette;
export type ColorName = keyof typeof colors;
