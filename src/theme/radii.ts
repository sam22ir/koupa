/** Corner radii for Teal Stage. Soft product shapes, not sharp ledger edges. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 22,
  pill: 999,
  avatar: 20,
  avatarSquare: 16,
} as const;

export type RadiusToken = keyof typeof radii;
