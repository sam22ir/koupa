const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Only block env files; keep Expo's default resolver intact.
config.resolver.blockList = [/\/\.env\.(staging|production)\.local$/];

// withUniwindConfig MUST be the outermost wrapper. Reanimated goes inside it.
module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});