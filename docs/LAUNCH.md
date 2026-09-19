# Launch Checklist — Runner

## Pre-production

- [ ] Supabase **staging** va **production** loyihalari yaratilgan
- [ ] Barcha migratsiyalar qo‘llangan (`supabase db push`)
- [ ] Auth SMS provider (Eskiz / Twilio) sozlangan
- [ ] Storage bucketlar va MIME cheklovlari tekshirilgan
- [ ] Edge Functions deploy: `create-escrow`, `release-escrow`, `process-payment-webhook`
- [ ] `PAYMENT_WEBHOOK_SECRET` va to‘lov provider kalitlari
- [ ] Mobile `.env` da faqat **anon** key (service role yo‘q)

## Mobile build

```bash
cd apps/mobile
npx eas login
npx eas build:configure   # projectId ni app.json ga yozing
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

- [ ] `eas.json` ichidagi Apple / Google submit maydonlari to‘ldirilgan
- [ ] Store ikonkalar, splash, screenshotlar (uz/ru)
- [ ] Privacy Policy va Terms URL (App Store / Play)

## Store metadata (qisqa)

| Field | UZ | RU |
|-------|----|----|
| Name | Runner | Runner |
| Subtitle | Ish va yaqin vazifalar | Работа и задания рядом |
| Category | Business / Lifestyle | Бизнес / Образ жизни |

## QA smoke

- [ ] Telefon OTP kirish
- [ ] Onboarding (3 rol)
- [ ] Vakansiya yaratish + ariza
- [ ] Hamyon to‘ldirish → vazifa → escrow → release
- [ ] Chat + sharh
- [ ] Til almashtirish (uz ↔ ru)

## Load smoke

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/load-smoke.mjs
```

Maqsad: `p95_ms < 800` (regions endpoint), `ok == total`.

## Admin KPI

Supabase SQL Editor:

```sql
SELECT * FROM admin_kpi_daily;
SELECT * FROM admin_task_funnel;
SELECT * FROM admin_top_regions;
```

## Post-launch

- [ ] Crash monitoring (Sentry)
- [ ] Analytics provider (PostHog/Amplitude) — `src/lib/analytics.ts`
- [ ] FCM push (ariza + chat)
- [ ] Click/Payme production webhook
