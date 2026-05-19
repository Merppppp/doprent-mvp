# DopRent

Bangkok boutique dress-rental marketplace. Renters browse dresses and contact
boutiques to book; every booking/ask action routes to the boutique's **LINE**
chat (no in-app payment). Live at **https://doprent.com**.

Stack: **Next.js 14** (App Router) · React 18 · TypeScript (strict) ·
**Supabase** (Postgres + Auth + RLS + Storage) · Tailwind · deployed on **Vercel**.

> New here? Read [`CONTRIBUTING.md`](CONTRIBUTING.md) (workflow + conventions)
> and [`ARCHITECTURE.md`](ARCHITECTURE.md) (how the code is laid out) first.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase + LINE values (or leave blank)
npm run dev                  # http://localhost:3000
```

With no Supabase env vars the catalog falls back to `data/sample-listings.json`
so every screen renders without a backend. Auth, seller, and admin flows need
real Supabase env vars.

> Do **not** develop inside a OneDrive/Dropbox-synced folder — cloud sync
> corrupts `node_modules`. Clone to a plain local path.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (must pass before a PR) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`next lint`) |

## What's in the app

- **Public**: landing, browse/filter catalog, dress detail, boutique pages
- **Accounts**: email + Google OAuth sign-in, saved/wishlist
- **Seller**: signup, KYC, dashboard, dress CRUD, availability calendar
- **Admin**: boutique/dress/KYC moderation, LINE-click metrics
- Booking happens off-platform via LINE deep links

## Environment

| Var | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-guarded) |
| `NEXT_PUBLIC_DEFAULT_LINE_URL` | Fallback LINE link for CTAs |

See `.env.example`. Real values are in the Vercel project's Environment
Variables — never commit `.env.local`.

## Deploy

Vercel auto-deploys this repo: **push to `main` → production at doprent.com**.
Branch pushes get a Vercel **preview** URL. Never commit straight to `main`;
open a PR (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
