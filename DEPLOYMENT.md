# ZEXUNA Restaurant — Deployment & Configuration Guide

**Tagline:** *Technology Without Limits.*

## 1. Architecture Overview
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router
- **Backend:** Express + TypeScript (`server.ts`) serving SSR/SPA assets, `/robots.txt`, `/sitemap.xml`, and hardened `/api/*` routes
- **Database & Auth:** Google Cloud Firestore (database ID in `firebase-applet-config.json`) + Firebase Authentication (Google Sign-In)
- **AI Concierge:** Server-side `@google/genai` integration (`gemini-4-hydrogen`) with structured function calling for real-time table availability & bookings

---

## 2. Environment Variables (Secrets)
Configure the following secrets in Google AI Studio / Google Cloud Run (never commit real secrets to source control; see `.env.example`):

| Variable | Required? | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Required for AI Concierge | Enables `/api/chat` powered by `gemini-4-hydrogen` |
| `APP_URL` | Recommended in Prod | Used for `sitemap.xml`, `robots.txt`, and server-side email links |
| `ADMIN_BOOTSTRAP_EMAIL` | Optional (defaults to `official.zexuna@gmail.com`) | First owner email permitted to initialize admin profile via `/api/admin/onboard` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Optional (JSON string) | Enables Firebase Admin SDK server-side operations; falls back to Google X.509 ID token verification + Firestore REST API if omitted |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Enables live HTML confirmation/enquiry emails via Nodemailer |
| `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_RECIPIENT` | Optional | Enables server-side WhatsApp Business Cloud API alerts in addition to client `wa.me/919999988787` ordering |

---

## 3. Hero Video Asset (`/public/assets/hero-biryani.mp4`)
- No build-time video generation tool was invoked without user-funded video generation credentials.
- The homepage renders an HTML5 `<video>` element pointed at `/assets/hero-biryani.mp4` (or `settings.heroVideoUrl` configured in **Admin → Restaurant Settings**), with a bespoke dark-luxury dum biryani photographic poster/fallback when the `.mp4` file is absent.
- To activate the cinematic commercial video:
  1. Place an optimized MP4 clip (`1920×1080`, H.264, `<= 15 MB`) at `/public/assets/hero-biryani.mp4`, **or**
  2. Sign in to `/admin/settings` and set a hosted HTTPS MP4 URL in **Hero Video URL**.

---

## 4. Firebase & Security Rules Hardening
- Rules live in `/firestore.rules` and indexes in `/firestore.indexes.json`.
- Before sharing broadly or launching publicly, review `/firestore.rules` and `/security_spec.md`:
  - Verify `ADMIN_BOOTSTRAP_EMAIL` (`official.zexuna@gmail.com`) matches your intended primary owner email.
  - Ensure only authorized staff are granted records in `admins/{uid}`.
  - Deploy any updates using `firebase deploy --only firestore:rules,firestore:indexes` or the AI Studio Firebase deploy flow.

---

## 5. First-Time Admin Setup & Demo Data Seeding
1. Navigate to `/admin/login` and click **Sign in with Google** using the authorized owner email (`official.zexuna@gmail.com`).
2. Your admin profile is initialized atomically in Firestore (`admins/{uid}`).
3. Open **Admin → Overview** and click **Seed / Reset Demo Menu & Tables** (or populate your own authentic prices, categories, offers, and table inventory directly via Menu Management and Offer Management).

---

## 6. Build & Run Commands
```bash
npm install
npm run lint
npm run build
npm start
```
The Express server binds to `PORT` (default `3000`) on `0.0.0.0`.
