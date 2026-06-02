.PHONY: dev build start \
        db-up db-down db-logs \
        db-migrate db-seed db-reset db-studio db-generate \
        typecheck lint

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

typecheck:
	npm run typecheck

lint:
	npm run lint

# ---------------------------------------------------------------------------
# Database (Docker + Prisma)
# ---------------------------------------------------------------------------

db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

db-generate:
	npx prisma generate

db-migrate:
	npx prisma migrate dev

db-seed:
	npx prisma db seed

db-studio:
	npx prisma studio

## Reset DB + migrate + seed (dev only)
db-reset:
	npx prisma migrate reset --force && npx prisma db seed
