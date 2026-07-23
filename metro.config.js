const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Environment files are loaded by Expo before Metro resolves application modules.
config.resolver.blockList = [/\/\.env\.(staging|production)\.local$/];

module.exports = config;
