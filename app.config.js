const baseConfig = require('./app.json').expo;

const environment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const firebaseConfig = {
  staging: './google-services.staging.json',
  production: './google-services.production.json',
}[environment];

module.exports = {
  ...baseConfig,
  scheme: baseConfig.scheme || 'koupa',
  userInterfaceStyle: baseConfig.userInterfaceStyle || 'automatic',
  plugins: [
    ...(baseConfig.plugins || []),
    'expo-router',
    'expo-status-bar',
    'expo-font',
    'expo-splash-screen',
    'expo-sharing',
  ],
  experiments: {
    ...(baseConfig.experiments || {}),
    typedRoutes: true,
    tsconfigPaths: true,
  },
  android: {
    ...baseConfig.android,
    ...(firebaseConfig ? { googleServicesFile: firebaseConfig } : {}),
  },
  extra: {
    ...(baseConfig.extra || {}),
    router: {
      origin: false,
    },
    // Layout supports RTL via styles; do not force a native restart.
    supportsRTL: true,
    forcesRTL: false,
  },
};
