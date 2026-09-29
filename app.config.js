const environment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const firebaseConfig = {
  staging: process.env.GOOGLE_SERVICES_STAGING || './google-services.staging.json',
  production: process.env.GOOGLE_SERVICES_PRODUCTION || './google-services.production.json',
}[environment];

module.exports = ({ config: baseConfig }) => ({
  ...baseConfig,
  scheme: baseConfig.scheme || 'koupa',
  userInterfaceStyle: baseConfig.userInterfaceStyle || 'automatic',
  plugins: Array.from(new Set([
    ...(baseConfig.plugins || []),
    ['expo-build-properties', { android: { minSdkVersion: 24 } }],
    'expo-router',
    'expo-status-bar',
    'expo-font',
    ['expo-splash-screen', {
      image: './assets/brand/splash-screen.png',
      imageWidth: 280,
      backgroundColor: '#1A7A78',
    }],
    ['expo-camera', { recordAudioAndroid: false }],
    ['expo-location', {
      locationWhenInUsePermission: 'اسمح لتطبيق كوپا باستخدام موقعك لعرض المحلات القريبة.',
    }],
    'expo-sharing',
    '@react-native-community/datetimepicker',
  ])),
  experiments: {
    ...(baseConfig.experiments || {}),
    typedRoutes: true,
    tsconfigPaths: true,
  },
  android: {
    ...baseConfig.android,
    ...(firebaseConfig ? { googleServicesFile: firebaseConfig } : {}),
    intentFilters: [
      ...((baseConfig.android && baseConfig.android.intentFilters) || []),
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { scheme: 'koupa', host: 'callback' },
          { scheme: 'koupa', pathPrefix: '/callback' },
        ],
      },
    ],
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
});
