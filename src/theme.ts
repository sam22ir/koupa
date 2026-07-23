export const colors = {
  background: '#F3F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EBEFED',
  surfaceHigh: '#E0E3E2',
  primary: '#1A7A78',
  primaryFixed: '#9DF1EE',
  onPrimary: '#FFFFFF',
  charcoal: '#323E4B',
  muted: '#4C6A68',
  outline: '#6E7978',
  outlineVariant: '#BDC9C8',
  gold: '#E1A553',
  danger: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onSurfaceVariant: '#3E4948',
  disabled: '#D7DBDA',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 4, lg: 8, xl: 12, full: 9999 } as const;
export const typography = {
  fontFamily: { regular: 'IBMPlexSansArabicRegular', medium: 'IBMPlexSansArabicMedium', semiBold: 'IBMPlexSansArabicSemiBold', bold: 'IBMPlexSansArabicBold' },
  size: { caption: 12, body: 15, label: 16, title: 22, hero: 32 },
  line: { caption: 18, body: 24, label: 25, title: 33, hero: 44 },
} as const;
