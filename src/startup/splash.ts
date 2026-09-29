import * as SplashScreen from 'expo-splash-screen';

/** Longest the native splash may stay up if startup never finishes. */
export const SPLASH_TIMEOUT_MS = 8000;

let hidden = false;

/**
 * Keep the native splash up from the first JS frame. It must be called at module
 * scope, before any component renders, or the splash can hide too early.
 */
export function holdSplash(): void {
  SplashScreen.setOptions({ fade: true, duration: 250 });
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

/** Hide the splash once. Safe to call repeatedly and from a timeout. */
export function hideSplash(): void {
  if (hidden) return;
  hidden = true;
  SplashScreen.hideAsync().catch(() => {});
}

/** Test seam: forget that the splash was hidden. */
export function resetSplashForTests(): void {
  hidden = false;
}

/**
 * The splash is only worth hiding once the session has been read and a real
 * screen (not the "/" session gate, which only shows a spinner) is on screen.
 */
export function isFirstScreenReady(input: { readonly loading: boolean; readonly pathname: string }): boolean {
  return !input.loading && input.pathname !== '/';
}
