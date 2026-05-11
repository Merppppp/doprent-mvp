# DopRent MVP v0.1 — Catalog only

Bangkok boutique-rental catalog. **No payment, no auth.** Every booking-related action routes to LINE and the boutique handles the rest in chat.

Stack: Next.js 14 (App Router) + Tailwind + Supabase. Deploy on Vercel.

## Run locally

```bash
cd doprent-mvp
npm install
cp .env.example .env.local   # fill in if you've created a Supabase project, otherwise leave blank
npm run dev
```

The app runs without Supabase by falling back to `data/sample-listings.json` (12 dresses). This is enough to demo all 3 screens.

## Pages

- `/` — Landing (hero, featured grid, "วิธีเช่า" 3-step)
- `/browse` — Catalog grid with color filter (`?color=rose`)
- `/dress/[id]` — Detail page with image gallery + two LINE CTAs

Both desktop and mobile responsive (Tailwind: `md:` breakpoint at 768px).

## Supabase setup (when ready)

1. Create a Supabase project at https://supabase.com
2. Run `supabase/schema.sql` in the SQL editor — creates `dresses`, `boutiques`, `line_clicks` with read-only RLS.
3. Drop the URL + anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Upload listing rows via Supabase Studio (≈3 hr per boutique onboarding per the v0.1 plan).

When the env vars are set, the data layer (`lib/dresses.ts`) automatically switches from the JSON fallback to Postgres.

## LINE deep-link

Each dress row has a `line_url` column. Format: `https://line.me/R/ti/p/@<oa-id>`. Default fallback is `NEXT_PUBLIC_DEFAULT_LINE_URL`. Both CTAs on the detail page (book / ask) open the boutique's LINE OA in a new tab. Click events post to `/api/track` and land in `line_clicks` for the v0.5 decision metric (>8% click-through).

## Deploy

```bash
# Vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_DEFAULT_LINE_URL
vercel --prod
```

Domain: point `doprent.com` (or `.co.th`) at Vercel.

## What's intentionally NOT here

Per the v0.1 lock (2026-05-04), there is **no**: Omise/payment, Resend/email, Auth, booking flow, calendar logic, real-time availability, mobile-only views, seller dashboard, reviews, wishlist, search beyond color, admin UI. All of this is deferred to v0.5+ pending the LINE click-through metric.

## File map

```
doprent-mvp/
  app/
    layout.tsx              # html shell, fonts
    globals.css             # tailwind + base
    page.tsx                # Landing
    browse/page.tsx         # Catalog
    dress/[id]/page.tsx     # Detail
    dress/[id]/not-found.tsx
    api/track/route.ts      # LINE click logger
  components/
    Header.tsx
    Footer.tsx
    DressCard.tsx
    Gallery.tsx
    ColorFilter.tsx
    LineButton.tsx          # 'use client', sendBeacon to /api/track
  lib/
    supabase.ts             # singleton, returns null if env missing
    dresses.ts              # listDresses / getDress with JSON fallback
    types.ts
  data/
    sample-listings.json    # 12 dresses, drives dev/demo
  supabase/
    schema.sql              # tables + RLS
  .env.example
```

## Build sequence ref

- Day 1: Scaffold + Supabase project + schema (this folder = day 1 done)
- Day 2: Browse + DressCard ✓
- Day 3: Detail + LINE deep-link ✓
- Day 4: Landing + polish + boutique 1 listings upload
- Day 5: Boutique 2 listings, friend testers, fixes

## Decision metric (per v0.1 plan)

After 2 weeks live: if **detail-page LINE CTR > 8%** AND **boutiques report >10 paid bookings**, build the Omise checkout (v0.5). Otherwise iterate on the catalog before adding payment complexity.
