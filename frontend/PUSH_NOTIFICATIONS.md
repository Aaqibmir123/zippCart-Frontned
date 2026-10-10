# Android Push Notifications

Expo Go cannot run remote push notifications for this app because the native notification module is not included in Expo Go. The app now skips all notification-module loading in Expo Go, so the rest of the app can still be opened there. Use a development build or an internal preview APK to test push notifications.

## Development build

```bash
npm install
npx eas login
npx eas build:configure
npm run build:android:dev
```

Install the generated APK on a real Android device. Start Metro with:

```bash
npm run start:dev-client
```

Open the installed ZippCart development app, not Expo Go. Keep the phone and computer on the same network, or use `--tunnel` with the start command.

## Firebase/EAS requirement

`google-services.json` must contain the Android package `com.aaqibmir.zippcart`. It is configured in `app.config.js` and included in the EAS Android build. For production EAS builds, configure Firebase FCM V1 credentials in EAS Android credentials if EAS requests them.

## Test

1. Install the development APK on a physical Android phone.
2. Sign in and allow notification permission.
3. Confirm the backend receives the Expo push token.
4. Place an order, then dispatch it from seller mode.
5. Verify the order notification appears and tapping it opens that order's details.

Android emulators and Expo Go are not valid tests for this remote push flow.