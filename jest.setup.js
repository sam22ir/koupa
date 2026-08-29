/**
 * Expo's winter runtime installs `fetch` and friends as lazy getters that
 * require expo-modules-core on first touch. That require runs
 * setUpJsLogger.fx.ts, which warns because the ExpoModulesCoreJSLogger native
 * module does not exist under Jest. If the first touch happens after a test
 * file has finished, the warning lands on a console Jest already tore down and
 * Jest exits 1 even though every suite passed (reproduces with --runInBand).
 *
 * Realising the getters here keeps that warning inside a live test context,
 * where it is harmless noise, instead of turning it into a post-teardown error.
 */
for (const name of [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'File',
  'atob',
  'btoa',
]) {
  try {
    void globalThis[name];
  } catch {
    // The lazy require may itself warn; either way it is no longer late.
  }
}

/**
 * Jest setup: wrap @testing-library/react-native `render` with
 * HeroUINativeProvider so screen tests render HeroUI Native components
 * inside the provider they require at runtime (mirrors app/_layout.tsx).
 *
 * Notes:
 * - RNTL v14 `render` is async (returns a Promise<RenderResult>); `rerender`
 *   must keep the provider wrapper or the subtree remounts and resets state.
 * - RNTL v14 mutates its own `exports.screen` via setRenderResult, so `screen`
 *   must be re-exposed as a live getter (a plain spread would snapshot the
 *   default "render has not been called" placeholder).
 */
jest.mock('@testing-library/react-native', () => {
  const actual = jest.requireActual('@testing-library/react-native');
  const React = require('react');
  const { HeroUINativeProvider } = require('heroui-native');

  const wrap = (ui) => React.createElement(HeroUINativeProvider, null, ui);

  const mock = { ...actual };
  mock.render = (ui, options = {}) => {
    const result = actual.render(wrap(ui), options);
    const withRerender = (renderResult) => ({
      ...renderResult,
      rerender: (nextUi, nextOptions) =>
        renderResult.rerender(wrap(nextUi), nextOptions),
    });
    return result && typeof result.then === 'function'
      ? result.then(withRerender)
      : withRerender(result);
  };

  Object.defineProperty(mock, 'screen', {
    enumerable: true,
    configurable: true,
    get: () => actual.screen,
  });

  return mock;
});