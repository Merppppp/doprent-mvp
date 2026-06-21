#!/usr/bin/env bash
# =============================================================================
# DopRent — Release script
# Bumps package.json version, commits, tags, and pushes.
#
# Usage:
#   bash scripts/release.sh 1.0.0        # → v1.0.0
#   bash scripts/release.sh 1.0.1        # → v1.0.1
#   bash scripts/release.sh              # prompts for version
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[release]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  err "Must be on 'main' branch. Current: $BRANCH"
  err "  git checkout main && git merge develop --no-ff"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  err "Working tree is dirty. Commit or stash changes first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Version input
# ---------------------------------------------------------------------------
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  CURRENT=$(node -p "require('./package.json').version")
  read -rp "Current version: $CURRENT — Enter new version (without v prefix): " VERSION
fi

# Strip leading 'v' if user typed it
VERSION="${VERSION#v}"

# Validate semver-ish
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+'; then
  err "Invalid version: $VERSION (expected semver like 1.0.0)"
  exit 1
fi

TAG="v$VERSION"

# Check tag doesn't exist
if git rev-parse "$TAG" &>/dev/null; then
  err "Tag $TAG already exists."
  exit 1
fi

log "Releasing $TAG"
echo ""

# ---------------------------------------------------------------------------
# Bump package.json
# ---------------------------------------------------------------------------
log "Bumping package.json → $VERSION"
npm version "$VERSION" --no-git-tag-version --allow-same-version

# ---------------------------------------------------------------------------
# Commit + tag + push
# ---------------------------------------------------------------------------
git add package.json package-lock.json
git commit -m "chore: release $TAG"
git tag -a "$TAG" -m "Release $TAG"

echo ""
log "Created commit + tag $TAG"
echo ""
echo -e "${YELLOW}Ready to push. This will trigger production deployment.${NC}"
read -rp "Push to origin? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  warn "Aborted push. Tag $TAG is local only."
  warn "To push later:  git push origin main --tags"
  exit 0
fi

git push origin main
git push origin "$TAG"

echo ""
log "============================================"
log "  $TAG pushed — production deploy triggered"
log "============================================"
