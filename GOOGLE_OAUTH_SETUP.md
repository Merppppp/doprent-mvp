# Google OAuth setup for DopRent

The code is in place — `GoogleSignInButton` is wired into `/login` and `/signup`, and `/auth/callback` handles the OAuth code exchange. You just need to:

1. Create a Google OAuth client in Google Cloud Console
2. Paste the credentials into Supabase

Once both are done, the button will work on production.

---

## Part 1 — Google Cloud Console (~30 min)

### Create the project

1. Go to https://console.cloud.google.com/
2. Top bar → project dropdown → **NEW PROJECT**
3. Name: `DopRent`. Location: leave default. Create.
4. Wait for project to provision (~10 sec), then select it from the dropdown.

### Configure OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**
2. User Type: **External**. Create.
3. **App information**
   - App name: `DopRent`
   - User support email: your Gmail
   - App logo: skip (can add later)
4. **App domain**
   - Application home page: `https://doprent.com`
   - Application privacy policy: `https://doprent.com/privacy` (create this page later; placeholder OK)
   - Application terms of service: `https://doprent.com/terms` (placeholder)
5. **Authorized domains**: add `doprent.com`
6. **Developer contact information**: your Gmail
7. Save and continue.
8. **Scopes**: click "Add or remove scopes". Select these three only:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   Save and continue.
9. **Test users**: while in testing mode, only listed emails can sign in. Add your Gmail + any tester emails. Skip if you publish (next step).
10. Summary → Back to dashboard.
11. **Publish app** (top of OAuth consent screen): click "PUBLISH APP" → confirm. Status changes to **In production**. Google won't actually review unless you request sensitive scopes — we use only basic profile, so this is instant.

### Create OAuth client credentials

1. **APIs & Services** → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `DopRent Web Client`
4. **Authorized JavaScript origins** — add these three:
   - `https://doprent.com`
   - `https://www.doprent.com`
   - `https://doprent-mvp.vercel.app`
   *(Add `http://localhost:3000` if you ever run dev locally.)*
5. **Authorized redirect URIs** — add this one:
   - `https://ryoqxbblkaupkeasyioe.supabase.co/auth/v1/callback`
   *(This is your Supabase project's auth callback. Note: it's the Supabase URL, NOT your doprent.com URL. Supabase receives the OAuth response first, then forwards to your app.)*
6. Create.
7. A modal pops up with **Client ID** and **Client secret**. Copy both. Keep this tab open or paste them somewhere safe — you need them for Part 2.

---

## Part 2 — Supabase (~5 min)

1. Go to Supabase Dashboard → project `ryoqxbblkaupkeasyioe`
2. Left menu → **Authentication** → **Providers**
3. Find **Google** in the list → expand
4. Toggle **Enable Sign in with Google** → ON
5. Paste:
   - **Client ID (for OAuth)**: the Client ID from Google
   - **Client Secret (for OAuth)**: the Client Secret from Google
6. Leave **Authorized Client IDs** empty (only needed for native iOS/Android apps)
7. **Skip nonce checks**: leave OFF
8. Save

---

## Part 3 — Test

1. Open `https://doprent.com/login` (or `https://www.doprent.com/login`)
2. Click "**เข้าสู่ระบบด้วย Google**"
3. Should redirect to Google's account chooser
4. Pick a Google account → consent screen → "Allow"
5. Browser bounces through `ryoqxbblkaupkeasyioe.supabase.co/auth/v1/callback` → `doprent.com/auth/callback?code=...` → final destination (defaults to `/account`)
6. You should be logged in. Check `/account` shows your name + Gmail.

---

## Troubleshooting

**"Error 400: redirect_uri_mismatch"**
→ The redirect URI in Google Cloud doesn't match what Supabase is using.
The ONE redirect URI to add is `https://ryoqxbblkaupkeasyioe.supabase.co/auth/v1/callback`, exactly. Not your doprent.com URL.

**"Unsupported provider: provider is not enabled"**
→ Google provider in Supabase Auth isn't toggled ON yet. Go back to Part 2 step 4.

**"This app isn't verified"**
→ Google shows this if your OAuth consent screen is in "Testing" status and the user isn't in the test users list. Either publish the app (consent screen → "PUBLISH APP") or add the user as a test user.

**Login works but user lands on the wrong page**
→ The `next` query param wasn't passed through. Check that the link they came from to `/login` had `?next=/some/path`. Default fallback is `/account`.

**Existing email/password user can't merge with Google sign-in**
→ Supabase merges by email automatically: if `you@gmail.com` already has an email/password account and signs in with Google for the same email, they become one user with two identities. No action needed.

---

## What happens server-side

When a user signs in with Google for the first time:

1. Google returns the user's `email`, `name`, `picture` (and a unique `sub` ID)
2. Supabase creates a row in `auth.users` with these fields → triggers `handle_new_user()`
3. `handle_new_user()` inserts a `profiles` row with role='customer' (or 'admin' if the email matches the allowlist in `lib/auth.ts` ADMIN_EMAILS)
4. The Google profile picture is in `raw_user_meta_data->>'avatar_url'` — unused currently but available for future avatar display
5. `email_confirmed_at` is auto-set (Google has already verified the email) — they skip the email confirmation step
