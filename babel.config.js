module.exports = function (api) {
  api.cache(true);
  return {
    // Koupa has no app-level Reanimated/worklet code. Keep Expo Go on its
    // stable JS runtime instead of initializing the optional native worklets
    // bridge during startup.
    presets: [['babel-preset-expo', { worklets: false, reanimated: false }]],
  };
};
