const { withAndroidManifest } = require('expo/config-plugins');

// Permissions allow runtime access; these declarations prevent Play from
// treating optional location/photo functionality as an installation requirement.
const optionalFeatures = [
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
];

module.exports = function withOptionalAndroidHardware(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    for (const name of optionalFeatures) {
      const existing = features.filter((feature) => feature.$['android:name'] === name);
      if (existing.length) {
        for (const feature of existing) feature.$['android:required'] = 'false';
      } else {
        features.push({ $: { 'android:name': name, 'android:required': 'false' } });
      }
    }
    return config;
  });
};
