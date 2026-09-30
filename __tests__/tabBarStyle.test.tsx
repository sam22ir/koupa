import { renderHook } from '@testing-library/react-native';

let mockBottomInset = 0;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: mockBottomInset, left: 0 }),
}));

import { useTabBarStyle } from '@/src/components/navigation/tabBarStyle';

describe('useTabBarStyle', () => {
  it('keeps the original size when there is no system inset', async () => {
    mockBottomInset = 0;
    const { result } = await renderHook(() => useTabBarStyle());
    expect(result.current.height).toBe(64);
    expect(result.current.paddingBottom).toBe(8);
  });

  it('lifts the tabs above on-screen navigation buttons', async () => {
    mockBottomInset = 48;
    const { result } = await renderHook(() => useTabBarStyle());
    expect(result.current.paddingBottom).toBe(48);
    expect(result.current.height).toBe(104);
  });
});
