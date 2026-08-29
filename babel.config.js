module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo auto-detects react-native-reanimated and
    // react-native-worklets when they are installed, enabling the worklet
    // transform. This is required by both HeroUI Native and Uniwind.
    presets: ['babel-preset-expo'],
  };
};