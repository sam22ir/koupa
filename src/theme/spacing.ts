/** 4px base scale used by Teal Stage layouts. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const;

export const layout = {
  screenPaddingX: space[5],
  screenPaddingTop: 18,
  sectionGap: 14,
  cardPadding: 18,
  tabBarPaddingBottom: 14,
  stageBodyOverlap: -36,
} as const;

export type SpaceToken = keyof typeof space;
