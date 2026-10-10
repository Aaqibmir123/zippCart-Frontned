const { validateProductionApiUrl } = require('./scripts/validate-production-api.cjs');

module.exports = ({ config }) => {
  if (
    process.env.APP_ENV === 'production' ||
    process.env.EAS_BUILD_PROFILE === 'production'
  ) {
    validateProductionApiUrl(process.env.EXPO_PUBLIC_API_URL);
  }

  return {
    ...config,

    name: 'JhelumKart',
    slug: 'zippcart',
    version: '1.1.0',

    icon: './assets/icon.png',

    android: {
      ...config.android,

      package: 'com.aaqibmir.zippcart',
      googleServicesFile: './google-services.json',

      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },
    plugins: [...(config.plugins ?? []), 'expo-notifications', 'expo-sharing', ['expo-location', {
      locationWhenInUsePermission: 'Allow JhelumKart to use your location to help with delivery.',
      locationAlwaysPermission: false,
      locationAlwaysAndWhenInUsePermission: false,
      motionUsagePermission: false,
      isAndroidMotionActivityEnabled: false,
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
      isAndroidForegroundServiceEnabled: false,
    }], './plugins/withOptionalAndroidHardware'],
  };
};
