# JhelumKart Android closed-testing preparation

## Build configuration

- Display name: `JhelumKart`; package: `com.aaqibmir.zippcart`.
- Display version: `1.1.0`; Android version code `2` has already been uploaded to Play.
- Production builds use `eas.json`, store distribution and `app-bundle` output (`.aab`).
- EAS manages build versions remotely (`cli.appVersionSource: remote`). Production
  builds automatically increment the Android version code (`autoIncrement: true`).
  The local code `2` in `app.json` only seeds a new remote counter; after initialization,
  EAS is the authority. A previously generated AAB keeps its original code.
  If the remote counter is behind Play, run `eas build:version:set --platform android
  --profile production` once and enter the highest code already uploaded. Do not reset
  a higher remote counter backwards. Then build with the production profile normally.
- EAS uses Node 22.16.0. Use Node 22.13+ locally for Expo SDK 57.
- Native launcher icons use the cropped green cart-and-leaf JhelumKart artwork.
  Native splash changes require a new installed build.
- `expo-splash-screen` supplies the native launch screen before JavaScript loads.
- No Sentry integration was added.

## First build

Run from the repository root in PowerShell, with Node 22.13+ installed:

```powershell
cd frontend
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile production
```

`init` links this local app to your Expo account/project and writes the real EAS
project ID. No account, project ID or signing credentials have been invented.
Allow EAS to generate/manage an Android keystore when prompted for this first app.
Keep access to that account and signing credentials for future updates.
After completion, download the AAB and upload it to the Play Console closed-testing track.
No cloud build or Play submission has been performed by this preparation.

## API environment

The confirmed production API URL is `https://api.zippcart.online/api/v1`; it is set
in the EAS production profile and in the local Expo environment. Shopping requires
a verified account and a reachable backend. The introduction,
phone login and OTP screens use the purple/orange design. Retired device-only
sessions are cleared on startup and cannot grant access to shopping.

Production sets `EXPO_NO_DOTENV=1`; `.easignore` also excludes local env files and
signing credentials. A laptop's `.env.local` is not a production configuration.
If the production host changes, update `EXPO_PUBLIC_API_URL` in the EAS **production**
environment and rebuild. Use plaintext visibility: this URL is public and embedded
in the bundle.
Never use `EXPO_PUBLIC_*` for JWT secrets, database credentials or private API keys.

`app.config.js` rejects HTTP, IP/LAN hosts, common placeholder domains and embedded
URL credentials in production. An unset URL also fails production validation.
The hostname check does not verify DNS, server health or certificate validity.

## Review findings / remaining release work

| Area | Finding |
| --- | --- |
| Privacy and Terms | Separate pages are wired from login, with back navigation and support email. They are current-build drafts, not final approved policies. |
| Public policy | No hosted public Privacy Policy URL exists in the project. Publish the finalized policy and enter its URL in Play Console. Confirm operator identity, retention/deletion periods and actual service-provider/sharing practices. |
| Account deletion | Account creation exists but account/data deletion is not implemented. Provide an in-app deletion request path and external web resource before releasing account creation. |
| Support / About | Drawer routes open Support and App info. Email is `miraaqib514@gmail.com`, phone is `+91 9596523404`, location is Kupwara, Jammu & Kashmir, India. App info reads name/version from app.json. Call/email launch handling exists; delivery and device behavior need a real-device check. |
| Navigation | Auth and shop routes type-check; legal back navigation, drawer panels, checkout success reset and onboarding completion were inspected in source. Device/back-gesture testing remains. Privacy/Terms are currently accessible from login, not the signed-in drawer. |
| Backend | Production hosting/HTTPS URL is pending. Real SMS uses the existing 2Factor integration with backend `OTP_DELIVERY=2factor` and `TWO_FACTOR_API_KEY`. Verify live delivery and account SMS balance before release. Console delivery is rejected in production. |
| Secrets | Source-pattern scan found development JWT fallback strings in backend/src/config/env.js. Set strong, distinct production JWT secrets and remove/reject those defaults before deploying the backend. No live private keys or embedded database credentials were found by the scoped scan; this is not a full security audit. |
| Dependencies | npm audit --omit=dev reported 18 moderate, 0 high, 0 critical findings, including transitive decode-uri-component and uuid advisories. Some fixes are unavailable; suggested forced Expo downgrades were not applied. Review compatible upstream fixes before release. |
| Store setup | Complete Data safety, app access/testing instructions, target audience/content rating, listing screenshots and closed-test setup. |

Google requires an in-app and publicly accessible privacy policy and, for apps
supporting account creation, account-deletion request options in-app and externally:
[Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).

## Verification

Current auth update: TypeScript passed, all 27 frontend/OTP tests passed, and
Android Hermes export passed (1,179 modules). Authored source files are below
500 lines. Physical-device visual and interaction checks remain pending.

Run from the repository root:

```powershell
npm --prefix frontend test
npm --prefix backend test
cd frontend
node node_modules/typescript/bin/tsc --noEmit
node node_modules/expo/bin/cli export --platform android --output-dir .expo/auth-preview
```

Export checks JavaScript and assets; it is not a native AAB/signing or device test.
Before uploading, test fresh-install onboarding, returning login, OTP entry/paste,
resend cooldown, session restoration, sign-out, offline errors, checkout and back
navigation on an Android device. Check native splash in a newly installed build.

Auth screens are in `screens/auth`, shared UI in `features/auth`, and onboarding
storage in `services/auth/session-storage.ts`. Artwork and generation prompts are
in `assets/auth/README.md`.

Reference: [Expo Android bundles](https://docs.expo.dev/build-reference/apk/),
[version management](https://docs.expo.dev/build-reference/app-versions/),
[SDK 57 splash configuration](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).
