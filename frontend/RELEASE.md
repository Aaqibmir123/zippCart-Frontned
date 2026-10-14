# JhelumKart Android closed-testing preparation

Updated 13 October 2026. Current results, customer/seller/admin feature status and
pending phases: [release review](../docs/release-readiness-2026-10-13.md).

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

## Build the next AAB

Run from the repository root in PowerShell, with Node 22.13+ installed:

```powershell
cd frontend
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
```

This app already has an EAS project ID. Keep that project, package name and signing
identity for the existing Play app; do not initialize a replacement project or key.
Keep access to the Expo account and existing signing credentials for future updates.
After completion, download the AAB and upload it to the Play Console closed-testing track.
No cloud build or Play submission has been performed by this preparation.

## API environment

The confirmed production API URL is `https://api.zippcart.online/api/v1`; it is set
in the EAS production profile. Local development may use a different API. Shopping requires
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
| Account deletion | In-app OTP-protected account deletion is implemented. Confirm the public external deletion resource and actual retention disclosures. Store owners/unresolved orders have explicit deletion blockers. |
| Support / About | Drawer routes open Support and App info. Email is `miraaqib514@gmail.com`, phone is `+91 9596523404`, location is Kupwara, Jammu & Kashmir, India. App info reads name/version from app.json. Call/email launch handling exists; delivery and device behavior need a real-device check. |
| Navigation | Auth and shop routes type-check; legal back navigation, drawer panels, checkout success reset and onboarding completion were inspected in source. Device/back-gesture testing remains. Privacy/Terms are currently accessible from login, not the signed-in drawer. |
| Backend | HTTPS route probes and one real 2Factor OTP request passed on 13 October. Deploy this matching backend, especially the return-address schema fix. Console delivery remains blocked in production. SMS receipt does not prove app session restoration. |
| Secrets | Startup rejects missing/placeholder JWT secrets; production requires distinct access/refresh secrets and a valid encryption key. Preserve deployed secrets. No production secret or backup review was performed here. |
| Dependencies | Fresh online audit completed after approval. Compatible patches removed all backend findings and frontend critical findings. Frontend still has 28 affected-package findings (16 high, 12 moderate) from four root advisories; see [security follow-up](../docs/dependency-security-audit-2026-10-13.md). Review these before final release approval. |
| Store setup | Complete Data safety, app access/testing instructions, target audience/content rating, listing screenshots and closed-test setup. |

Google requires an in-app and publicly accessible privacy policy and, for apps
supporting account creation, account-deletion request options in-app and externally:
[Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).

## Verification

13 October: TypeScript passed; frontend 293 tests and backend 216 tests passed.
The default backend run skipped 20 opt-in integration tests; five suites were run
separately with 60 passing database checks. Android Hermes export passed under
Node 22.16.0 (1,567 modules); all 588 authored source files remain below 500 lines.
Physical-device visual and interaction checks remain pending.

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
