# Staging setup — Runner

Runner can be tested for free using a separate Supabase Free project plus an Expo EAS internal Android build.

## 1. Create a Supabase staging project

Create a new Supabase project named something like `runner-staging`.

Do not reuse the future production project.

Record:
- Project URL
- anon/public key

Never put the service-role key in the mobile app.

## 2. Apply database migrations

From the repository root, after linking the staging project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
npx supabase db push
```

Deploy the Edge Functions used by the app:

```bash
npx supabase functions deploy create-escrow
npx supabase functions deploy release-escrow
npx supabase functions deploy process-payment-webhook
```

For staging, do not enable real payments yet. The wallet top-up UI remains disabled until Click/Payme/Uzum is integrated correctly.

## 3. Configure mobile staging environment

Create `apps/mobile/.env` locally from `.env.example`:

```env
APP_ENV=staging
EAS_PROJECT_ID=YOUR_EAS_PROJECT_ID
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## 4. Configure Expo/EAS

From `apps/mobile`:

```bash
npx eas login
npx eas build:configure
```

Copy the generated EAS project ID into `EAS_PROJECT_ID`.

For EAS cloud builds, add the staging variables to the EAS environment/secrets instead of committing them to Git.

## 5. Build an installable Android APK

```bash
cd apps/mobile
npx eas build --platform android --profile staging
```

The staging profile produces an internal APK. It uses:
- app name: Runner Staging
- Android package: `uz.runner.app.staging`
- iOS bundle id: `uz.runner.app.staging`

This keeps staging separate from the future production app.

## 6. Minimum staging QA

Test:
1. OTP sign-in
2. onboarding/profile
3. vacancy creation and application flow
4. micro-task creation
5. escrow hold with a pre-seeded test wallet
6. runner accept/start/complete
7. employer release
8. chat
9. review
10. Uzbek/Russian switching

Do not test with real money until the native Click/Payme/Uzum webhook verification is implemented.
