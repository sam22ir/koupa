/** Corner radii for Koupa Teal. Global.css mirrors sm/md/lg for HeroUI parts. */
export const radii = {
  xs: 6,
  sm: 10,
  /** Buttons, fields, icon buttons. */
  md: 14,
  /** Cards. */
  lg: 18,
  xl: 20,
  /** Sheets, dialogs, the teal stage's bottom corners. */
  '2xl': 24,
  '3xl': 28,
  pill: 999,
  avatar: 16,
  avatarSquare: 16,
} as const;

export type RadiusToken = keyof typeof radii;
