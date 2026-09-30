import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

const TAB_BAR_CONTENT_HEIGHT = 64;
const TAB_BAR_MIN_BOTTOM_PADDING = 8;

/**
 * Bottom tab bar style that sits above Android's on-screen navigation buttons
 * (and gesture bar). A fixed height without the bottom inset draws the tabs
 * underneath the system buttons, so they cannot be tapped.
 */
export function useTabBarStyle() {
  const { bottom } = useSafeAreaInsets();
  const paddingBottom = Math.max(bottom, TAB_BAR_MIN_BOTTOM_PADDING);
  return {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: TAB_BAR_CONTENT_HEIGHT - TAB_BAR_MIN_BOTTOM_PADDING + paddingBottom,
    paddingBottom,
    paddingTop: 8,
  };
}
