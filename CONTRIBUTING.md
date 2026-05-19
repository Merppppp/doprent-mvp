# Contributing

## Golden rule

**`main` is production.** A push/merge to `main` auto-deploys to
https://doprent.com via Vercel. Never commit or push directly to `main`.

## Workflow

```bash
git checkout main && git pull
git checkout -b <type>/<short-desc>      # feat/ fix/ chore/ refactor/
# ...make changes...
npm run typecheck && npm run lint && npm run build   # all must pass
git commit -m "type: what changed and why"
git push -u origin <branch>              # gets a Vercel PREVIEW url (safe)
gh pr create                             # open PR; a human reviews + merges
```

Keep a PR focused on one concern. Don't bundle a dependency upgrade or a
behavior change into a structure/cleanup PR.

## Conventions

- **TypeScript strict**, no `any`. Types mirror the DB — see `lib/types.ts`
  and `supabase/schema.sql`.
- **Imports use the `@/` alias** (maps to repo root), e.g.
  `@/components/dress/DressCard`, `@/lib/auth`. Avoid `../../` chains.
- **Components are grouped by domain** under `components/`:
  `layout/` · `dress/` · `booking/` · `auth/` · `ui/`.
  Add a new component to the folder that matches its role; if it's a generic
  presentational primitive, it goes in `ui/`.
- **Routes** live in `app/<route>/page.tsx` (Next App Router). Route-specific
  components are co-located next to the route (this is intentional, keep it).
- **Server Actions** live in `app/actions/*.ts` (`"use server"`).
- A component is a Server Component by default. Add `"use client"` only when
  it needs state/effects/browser APIs.

## Which Supabase client do I use?

| File | Use it in | Auth/session? |
|---|---|---|
| `@/lib/supabase/server` `createClient()` | Server Components, Route Handlers, Server Actions | ✅ user session via cookies |
| `@/lib/supabase/browser` `createClient()` | Client Components (`"use client"`) | ✅ user session via cookies |
| `@/lib/supabase` `getSupabase()` | public **catalog reads** only (e.g. `lib/dresses.ts`) | ❌ anon key, no session |

Using the wrong one is the most common mistake here. Authenticated data →
server/browser ssr client. Public unauthenticated catalog data → `getSupabase`.
`middleware.ts` refreshes the session on every request — don't duplicate that.

## Don't

- Commit `.env.local` or any secret (they're gitignored — keep it that way).
- Develop inside a OneDrive/Dropbox-synced folder (corrupts `node_modules`).
- Push to `main`. Open a PR.
