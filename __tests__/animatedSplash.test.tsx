import { act, render } from '@testing-library/react-native';

import {
  AnimatedSplash,
  SPLASH_REDUCED_TOTAL_MS,
  SPLASH_TOTAL_MS,
} from '@/src/startup/AnimatedSplash';
import { hideSplash, resetSplashForTests } from '@/src/startup/splash';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => mockReduceMotion,
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => Promise.resolve(),
  preventAutoHideAsync: () => Promise.resolve(true),
  setOptions: jest.fn(),
}));

// The layer is hidden from the accessibility tree on purpose; the queries must still see it.
const HIDDEN = { includeHiddenElements: true } as const;

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

describe('AnimatedSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetSplashForTests();
    mockReduceMotion = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps covering the app until the native splash has hidden', async () => {
    const screen = await render(<AnimatedSplash />);

    expect(screen.getByTestId('animated-splash', HIDDEN).props.pointerEvents).toBe('auto');
    await advance(SPLASH_TOTAL_MS * 3);
    // Nothing plays, so nothing is removed, until the native splash has hidden.
    expect(screen.queryByTestId('animated-splash', HIDDEN)).not.toBeNull();
  });

  it('plays after the native splash hides, then removes itself', async () => {
    const screen = await render(<AnimatedSplash />);

    await act(async () => {
      hideSplash();
    });
    expect(screen.getByTestId('animated-splash', HIDDEN).props.pointerEvents).toBe('none');

    await advance(SPLASH_TOTAL_MS - 1);
    expect(screen.queryByTestId('animated-splash', HIDDEN)).not.toBeNull();

    await advance(2);
    expect(screen.queryByTestId('animated-splash', HIDDEN)).toBeNull();
  });

  it('starts immediately when the native splash was already hidden', async () => {
    hideSplash();
    const screen = await render(<AnimatedSplash />);

    expect(screen.getByTestId('animated-splash', HIDDEN).props.pointerEvents).toBe('none');
    await advance(SPLASH_TOTAL_MS + 1);
    expect(screen.queryByTestId('animated-splash', HIDDEN)).toBeNull();
  });

  it('only fades quickly when reduced motion is on', async () => {
    mockReduceMotion = true;
    hideSplash();
    const screen = await render(<AnimatedSplash />);

    expect(SPLASH_REDUCED_TOTAL_MS).toBeLessThan(SPLASH_TOTAL_MS);
    await advance(SPLASH_REDUCED_TOTAL_MS + 1);
    expect(screen.queryByTestId('animated-splash', HIDDEN)).toBeNull();
  });
});
