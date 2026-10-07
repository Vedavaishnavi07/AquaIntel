# AquaIntel

Mobile-first shrimp farm records and transparent harvest scenarios. React, TypeScript, Express, PostgreSQL/Drizzle, Zod and Tailwind, with separate Python research.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:5173 and register. Create a farm, pond and crop using the original stocking date. Local PostgreSQL (PGlite) migrations run automatically. Records and original images persist under .local/. Optional configuration is in .env.example. Never commit private data or .env.

## Demo

Stop the regular server first.

```sh
npm run build
npm run demo:serve
```

Login: **demo@aquaintel.local / Demo-shrimp-2026!**. Synthetic data uses a separate local database.

## Features

Farm-scoped accounts; mid-cycle onboarding and backfill; feed and observations; measured sampling and growth charts; original images linked to ground truth; costs; manual market prices; timeline; assumed survival and biomass ranges; conditional FCR; saved harvest scenarios; decisions and outcomes; audited corrections; CSV export; installable PWA.

Unknown values remain unknown. ABW = sample grams / count. Count/kg = 1000 / ABW. Biomass = stocked count × assumed survival × ABW / 1000. FCR requires complete feed history and initial biomass. Incomplete costs yield margin over recorded costs, not complete crop profit. No disease diagnosis or production AI is provided.

## Structure

```text
apps/       React interface and Express server
packages/   Domain calculations, validation, database and migrations
tests/      Unit, integration and browser tests
scripts/    Migration, demo and build helpers
ml/         Isolated synthetic forecasting experiments
infra/      HTTPS proxy configuration
.github/    Continuous integration
```

## Verify

```sh
npm run check
npx playwright install chromium
# Keep npm run demo:serve running in another terminal:
npm run test:e2e
```

Tests use disposable PGlite databases. TEST_DATABASE_URL selects a disposable native PostgreSQL database. Never use pilot data for tests.

## Deploy

Requires a Docker/Compose host, persistent storage and a domain pointing to it. Allow ports 80/443. Create a private .env:

```dotenv
DOMAIN=farm.example.com
APP_ORIGIN=https://farm.example.com
DB_PASSWORD=replace-with-a-strong-random-hex-secret
REGISTRATION_CODE=replace-with-a-different-random-secret
```

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Caddy provides HTTPS; PostgreSQL and the app remain on the private container network. Verify /api/health, login, records, image retrieval and persistence on the target server. Android users can open the HTTPS URL in Chrome and install from its menu. Internet is required to save records.

Back up PostgreSQL with pg_dump and the original image volume together during a write pause. Encrypt backups off-host and test restoration into a separate deployment. Local development backups must preserve both .local/postgres and .local/uploads with the app stopped.

## Research and limitations

See ml/README.md for reproducible Python experiments and the data contract. Synthetic results are not field validation. Production does not consume experimental model outputs.

Public deployment, physical Android installation and real-farm outcomes require validation. Docker/native PostgreSQL deployment has not been verified in this workspace. Automated password recovery, offline writes and partial-harvest reconciliation are not implemented. No business-impact claims are made.