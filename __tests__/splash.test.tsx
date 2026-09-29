import { render } from '@testing-library/react-native';

const mockHideAsync = jest.fn(() => Promise.resolve());
const mockPreventAutoHideAsync = jest.fn(() => Promise.resolve(true));
const mockSetOptions = jest.fn();

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideAsync(),
  preventAutoHideAsync: () => mockPreventAutoHideAsync(),
  setOptions: (...args: unknown[]) => mockSetOptions(...args),
}));

let mockLoading = true;
let mockPathname = '/';

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ loading: mockLoading }),
}));

import { SplashGate } from '@/src/startup/SplashGate';
import {
  hideSplash,
  holdSplash,
  isFirstScreenReady,
  resetSplashForTests,
} from '@/src/startup/splash';

describe('splash readiness', () => {
  it.each([
    [{ loading: true, pathname: '/' }, false],
    [{ loading: true, pathname: '/welcome' }, false],
    [{ loading: false, pathname: '/' }, false],
    [{ loading: false, pathname: '/welcome' }, true],
    [{ loading: false, pathname: '/home' }, true],
    [{ loading: false, pathname: '/callback' }, true],
  ])('%j -> ready=%s', (input, ready) => {
    expect(isFirstScreenReady(input)).toBe(ready);
  });
});

describe('splash controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSplashForTests();
  });

  it('holds the native splash with a fade from the first frame', () => {
    holdSplash();

    expect(mockPreventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith({ fade: true, duration: 250 });
  });

  it('hides only once, however many times it is asked', () => {
    hideSplash();
    hideSplash();
    hideSplash();

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('never throws if the native module rejects', async () => {
    mockHideAsync.mockRejectedValueOnce(new Error('native'));

    expect(() => hideSplash()).not.toThrow();
    await Promise.resolve();
  });
});

describe('SplashGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSplashForTests();
    mockLoading = true;
    mockPathname = '/';
  });

  it('keeps the splash while the session loads', async () => {
    mockLoading = true;
    mockPathname = '/welcome';
    await render(<SplashGate />);

    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it('keeps the splash while only the "/" session gate is showing', async () => {
    mockLoading = false;
    mockPathname = '/';
    await render(<SplashGate />);

    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it('hides the splash once the first real screen is ready', async () => {
    mockLoading = false;
    mockPathname = '/welcome';
    await render(<SplashGate />);

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
