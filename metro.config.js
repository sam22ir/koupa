const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Only block env files; keep Expo's default resolver intact.
config.resolver.blockList = [/\/\.env\.(staging|production)\.local$/];

module.exports = config;
