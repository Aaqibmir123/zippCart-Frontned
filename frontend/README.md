# ZippCart frontend

Expo SDK 57 / React Native. Use Node 22.13+.

## Local setup

Install dependencies with `npm ci` inside `frontend` and `backend`.
`frontend/.env.local` points to the live HTTPS API at `https://api.zippcart.online/api/v1`,
so local Expo sessions use the hosted backend rather than localhost. Run
`npx expo start --lan` from `frontend`. The API URL is public configuration, not a secret.

Sign-in requires the backend. For local OTP testing use backend development mode
with `OTP_DELIVERY=console`; request a code in the app and read the latest
`[LOCAL OTP]` entry in the backend terminal. For real SMS, configure
`OTP_DELIVERY=2factor` and `TWO_FACTOR_API_KEY` in the backend only. Codes expire
after five minutes. Console delivery cannot be used in production.

## Structure

- `screens/auth`: splash, three-page introduction, phone login and OTP.
- `features/auth`: shared presentation components and styles.
- `services/auth`: request mutations and onboarding storage.
- `context/AuthContext.tsx`: server-backed session restoration and account state.

The three introduction screens appear after the splash on each signed-out launch.
Successful verification opens
the correct account area. Device-only shopping has been removed; old local
session records are cleared at startup and never merged into an account.

Tests live in `frontend/tests`. From the repository root, run
`npm --prefix frontend test` and `npm --prefix frontend run typecheck`.
Inside `frontend`, use `npm test` and `npm run typecheck`.
See [release preparation](RELEASE.md) for production configuration and device checks.
See [auth artwork](assets/auth/README.md) for generated assets and prompts.
