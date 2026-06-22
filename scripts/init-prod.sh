#!/usr/bin/env bash
# =============================================================================
# DopRent MVP — First Production Init Script
# Usage: DIRECT_DATABASE_URL="postgresql://..." bash scripts/init-prod.sh
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[init]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if [ -z "${DIRECT_DATABASE_URL:-}" ]; then
  err "DIRECT_DATABASE_URL is not set. Export it before running this script."
  err "  export DIRECT_DATABASE_URL='postgresql://user:pass@host:5432/doprent'"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

log "Project dir: $PROJECT_DIR"
log "Target DB:   ${DIRECT_DATABASE_URL%%@*}@****"

echo ""
echo -e "${YELLOW}=== PRODUCTION INIT — This will run against the PRODUCTION database ===${NC}"
echo -e "${YELLOW}Steps: pg_trgm extension → prisma migrate deploy → seed reference data${NC}"
echo ""
read -rp "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# ---------------------------------------------------------------------------
# Step 1: Ensure pg_trgm extension exists
# ---------------------------------------------------------------------------
log "Step 1/4: Checking pg_trgm extension..."
if command -v psql &>/dev/null; then
  psql "$DIRECT_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null && \
    log "  pg_trgm OK" || \
    warn "  Could not create pg_trgm via psql. DBA may need to run: CREATE EXTENSION IF NOT EXISTS pg_trgm;"
else
  warn "  psql not found locally. Ensure pg_trgm is already enabled on the server."
  warn "  DBA command: CREATE EXTENSION IF NOT EXISTS pg_trgm;"
fi

# ---------------------------------------------------------------------------
# Step 2: Generate Prisma client
# ---------------------------------------------------------------------------
log "Step 2/4: Generating Prisma client..."
npx prisma generate

# ---------------------------------------------------------------------------
# Step 3: Run all migrations
# ---------------------------------------------------------------------------
log "Step 3/4: Running prisma migrate deploy..."
npx prisma migrate deploy

# ---------------------------------------------------------------------------
# Step 4: Seed reference data (product types, categories, tags, areas)
# ---------------------------------------------------------------------------
log "Step 4/4: Seeding reference data..."
npx tsx prisma/seed.ts

echo ""
log "============================================"
log "  Production init complete!"
log "============================================"
echo ""
log "Next steps:"
log "  1. Set ADMIN_EMAILS env var with admin email addresses"
log "  2. First admin sign-in via Google → auto-promoted to admin role"
log "  3. Tag the release: git tag v1.0.0 && git push origin v1.0.0"
log "  4. Verify the deployment at the production URL"
