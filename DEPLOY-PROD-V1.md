# DopRent MVP — First Production Deployment Checklist

## Pre-deploy: Infrastructure

- [ ] Production PostgreSQL 16 is running and accessible
- [ ] DB user has CREATE EXTENSION privilege (for pg_trgm), or DBA has pre-run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
- [ ] PgBouncer configured (transaction mode, pool_size >= 10)
- [ ] S3-compatible storage ready (Cloudflare R2 recommended)
  - [ ] Public bucket for product images
  - [ ] Private bucket for payment slips (presigned URLs)
- [ ] DNS configured for production domain

## Pre-deploy: Environment Variables

All required env vars set in production environment:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PgBouncer connection string |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL (for migrations) |
| `NEXTAUTH_URL` | Production URL (e.g. https://doprent.com) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth (production redirect URI) |
| `GOOGLE_CLIENT_SECRET` | |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `EMAIL_SERVER_HOST` | `smtp.resend.com` |
| `EMAIL_SERVER_PORT` | `465` |
| `EMAIL_SERVER_USER` | `resend` |
| `EMAIL_SERVER_PASSWORD` | Resend API key |
| `EMAIL_FROM` | `noreply@doprent.com` |
| `NEXT_PUBLIC_DEFAULT_LINE_URL` | LINE OA link |
| `NEXT_PUBLIC_ASSET_BASE_URL` | Public asset CDN URL |
| `S3_ENDPOINT` | R2 endpoint |
| `S3_REGION` | `auto` |
| `S3_ACCESS_KEY_ID` | |
| `S3_SECRET_ACCESS_KEY` | |
| `S3_BUCKET` | Public bucket name |
| `S3_PUBLIC_URL` | e.g. `https://media.doprent.com` |
| `S3_PRIVATE_BUCKET` | Private bucket (slips) |
| `S3_FORCE_PATH_STYLE` | `false` for R2 |

Optional:
| `NEXT_PUBLIC_GA_ID` | Google Analytics |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity |
| `PLATFORM_COMMISSION_RATE` | Default `0.10` |

## Deploy Steps

### 1. Merge develop → main (UAT)

```bash
git checkout main
git merge develop --no-ff -m "Merge develop into main — MVP v1.0.0 UAT release"
git push origin main
```

Verify UAT works before continuing.

### 2. Init production database

```bash
export DIRECT_DATABASE_URL="postgresql://user:pass@prod-host:5432/doprent"
bash scripts/init-prod.sh
```

This runs:
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm`
2. `prisma migrate deploy` (all 29 migrations)
3. `prisma/seed.ts` (reference data: product types, categories, tags, areas)

### 3. Release: bump version + tag + push (triggers prod deploy)

```bash
bash scripts/release.sh 1.0.0
```

This script (must run on `main` branch):
1. Bumps `package.json` version to match the tag
2. Commits the version bump
3. Creates annotated tag `v1.0.0`
4. Confirms before pushing
5. Pushes main + tag → triggers prod deploy

The `sync-to-fork.yml` workflow syncs tags to `doprent/doprent-mvp`.

### 4. Post-deploy verification

- [ ] Home page loads, product grid renders
- [ ] Google sign-in works (admin email auto-promotes)
- [ ] Admin dashboard accessible at `/admin`
- [ ] Seller signup flow: `/sell/signup` → KYC → shop created
- [ ] Product creation with image upload (S3)
- [ ] Booking flow: browse → book → slip upload → confirmation
- [ ] Email notifications sending (check Resend dashboard)
- [ ] Mobile responsive: hamburger drawer on seller/admin
- [ ] Search (trigram) returns results

## Rollback

If critical issues found:

```bash
# Revert to previous tag (or no tag if first deploy)
# Fix on develop → re-merge → new tag
git tag v1.0.1
git push origin v1.0.1
```

Database rollback is NOT automatic. If a migration breaks:
1. Fix forward with a new migration
2. Or manually revert SQL changes (keep backup before deploy)

## Notes

- Admin users: configured via `ADMIN_EMAILS` env var. First Google sign-in auto-promotes matching emails.
- No demo/mock data is seeded in production. Only reference data (types, categories, tags, areas).
- `seed.dev.ts` is for development only — never run in production.
