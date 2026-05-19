# Architecture

DopRent is a Next.js 14 App-Router app backed by Supabase. Rendering is mostly
server-side; booking is intentionally off-platform (LINE).

## Folder map

```
app/                     Next.js App Router
  page.tsx               landing
  browse/                catalog + filters
  dress/[id]/            dress detail (gallery, LINE CTAs, OG image)
  boutique/[slug]/       public boutique page
  boutiques/             boutique directory
  account/               signed-in user account
  login/ signup/         auth entry (email + Google OAuth)
  auth/                  OAuth callback + signout route handlers
  sell/                  seller: signup, kyc, dashboard, dresses, edit
  admin/                 moderation: boutiques, dresses, kyc, clicks
  actions/               Server Actions ("use server"): admin, seller,
                         availability, saved
  api/track/             LINE-click logger (route handler)
  layout.tsx error.tsx not-found.tsx sitemap.ts robots.ts opengraph-image

components/               grouped by domain (see CONTRIBUTING)
  layout/  Header Footer MobileMenu ScrollTopButton
  dress/   DressCard DressArt Gallery ColorFilter SaveButton
  booking/ AvailabilityCalendar DateRangePicker LineButton
  auth/    GoogleSignInButton
  ui/      Skeleton VerifiedBadge

lib/
  supabase/server.ts     ssr client — Server Components / Actions / Handlers
  supabase/browser.ts    ssr client — Client Components
  supabase.ts            anon singleton + isSupabaseConfigured +
                         DEFAULT_LINE_URL — public catalog reads only
  auth.ts                getCurrentUser(): user + profile (auto-creates row)
  dresses.ts             catalog data layer + Browse filters
  line.ts                normalize LINE handles/URLs → clickable links
  bangkok-districts.ts   location reference data
  types.ts               TS types mirroring supabase/schema.sql

middleware.ts            refreshes Supabase session on every request
supabase/                schema.sql, seed.sql, migrations/
data/sample-listings.json  offline fallback when Supabase env is absent
```

## Request / data flow

1. `middleware.ts` runs on every request and refreshes the Supabase auth
   session cookie (wrapped in try/catch — a Supabase blip never 500s the site).
2. Server Components/Actions call `@/lib/supabase/server` `createClient()`
   (session-aware). Client Components use `@/lib/supabase/browser`.
3. Public catalog reads go through `lib/dresses.ts`, which uses the anon
   `getSupabase()` from `@/lib/supabase`. If Supabase env is missing it falls
   back to `data/sample-listings.json` so the app still renders.
4. Access control is enforced by **Supabase RLS** (see `supabase/schema.sql`
   + `supabase/migrations/`), not just app code. `lib/auth.ts` resolves the
   current user/profile and an admin allowlist.
5. Booking is off-platform: `lib/line.ts` builds a LINE deep link; CTA clicks
   post to `app/api/track` (`line_clicks`) for the conversion metric.

## Data model (Supabase)

`profiles` · `boutiques` · `dresses` · `occasions` · `line_clicks` ·
KYC / verification fields · dress blackout dates (availability) · saved
(wishlist). Schema is the source of truth in `supabase/schema.sql`; changes
go through dated files in `supabase/migrations/`. `lib/types.ts` must stay in
sync with it.

## Deploy pipeline

GitHub `Merppppp/doprent-mvp` → Vercel. Push to `main` = production deploy to
doprent.com. Branch push = isolated Vercel preview deploy. Env vars are managed
in the Vercel project, not in the repo.
