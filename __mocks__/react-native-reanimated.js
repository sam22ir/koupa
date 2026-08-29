/**
 * Extended react-native-reanimated Jest mock.
 * The official `react-native-reanimated/mock` omits the reanimated-4
 * `useReducedMotion` hook, which HeroUI Native's animation-settings provider
 * calls during render. Add it here; keep everything else from the official mock.
 */
const reanimatedMock = require('react-native-reanimated/mock');

module.exports = {
  ...reanimatedMock,
  useReducedMotion: () => false,
};