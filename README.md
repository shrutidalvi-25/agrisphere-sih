# AgriSphere

SIH 2026 — PS26132. A single platform that turns scattered mandi prices into
one clear answer, and lets farmers and buyers check each other's track
record before agreeing to a deal.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev
```

Opens at `http://localhost:5173`.

## One-time Supabase setup (whoever owns Module 1 does this first)

1. Create a project at supabase.com (free tier).
2. Go to SQL Editor → paste and run `supabase/01_profiles.sql`.
3. Go to Authentication → Providers → make sure **Email** is enabled.
4. Copy your Project URL and anon public key (Settings → API) into `.env`.
5. Invite the rest of the team to the Supabase project (Project Settings → Team).

## Folder structure

```
src/
  lib/            shared setup — supabaseClient.js, i18n.js
  locales/        en.json, hi.json, mr.json (multilingual text)
  features/
    auth/         Module 1 + 2 — DONE (login, signup, roles, language switcher)
    price-intel/  Module 3 + 4 — price dashboard, sell/hold advisor
    lot-grading/  Module 5 — lot creation, AI grading, voice input
    buyer-matching/  Module 6 — buyer discovery, offers, price lock
    fpo/          Module 7 — FPO pooling, payment split-back
    reliability/  Module 8 + 9 — payment tracking, reliability score
supabase/         one .sql file per module — run each in the SQL Editor as that module is built
```

## What's already built

**Module 1 — Auth & Roles** and **Module 2 — Multilingual UI** are working:
- Sign up / log in with email + password, choose a role (Farmer / Buyer / FPO / Admin)
- Role is stored in the `profiles` table and gates what a user can see (`ProtectedRoute`)
- Language switcher (Marathi / Hindi / English) — Marathi is the default
- A placeholder home screen per role, ready for each module owner to fill in

## What everyone else builds next

Each person creates their feature inside their assigned `src/features/<name>/` folder,
and adds their own `supabase/0X_<name>.sql` file for any new tables they need.
Reuse `useAuth()` (from `features/auth/AuthContext`) to get the logged-in user's
role and ID — don't build a second auth system.

See the full module-by-module build guide (tools, steps, definition of done)
that was shared separately for exact instructions per module.

## Tech stack

React + Vite + Tailwind (frontend) · Supabase (auth, Postgres, storage) ·
Python FastAPI (ML service, added when Module 5's grading model is ready) ·
i18next (Marathi/Hindi/English)
