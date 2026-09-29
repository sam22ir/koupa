/** Motion timing. Keep feedback quick; respect the OS reduce-motion setting. */
export const motion = {
  duration: {
    press: 120,
    fast: 180,
    base: 240,
    slow: 320,
  },
  /** Scale applied to pressable cards and buttons while held. */
  pressScale: 0.98,
} as const;
