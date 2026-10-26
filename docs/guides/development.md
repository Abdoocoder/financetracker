<!-- generated-by: gsd-doc-writer -->

# DEVELOPMENT.md

## Local Setup

### Prerequisites
- **Node.js 20 or newer** (no `.nvmrc` in repo; modern LTS works)
- **Flutter 3.47.7** (stable channel, Dart 3.13.5)
- **Android SDK** (`targetSdk = flutter.targetSdkVersion` in `mobile/fajrak_flutter/android/app/build.gradle.kts`)
- **Supabase CLI 2.116.0**
- **JDK 17 or newer**
- **Linux desktop build deps** (for `flutter run -d linux` / `flutter build linux`):
  ```bash
  sudo apt-get install -y clang cmake ninja-build pkg-config \
    libgtk-3-dev libstdc++-12-dev liblzma-dev \
    libcurl4-openssl-dev zlib1g-dev
  ```
  The last two are required by `sentry_flutter` (vendors `sentry-native` via CMake with `find_package(CURL REQUIRED COMPONENTS AsynchDNS)`).

### Clone and Install
```bash
# 1. Clone the repo
git clone git@github.com:Abdoocoder/financetracker.git
cd financetracker

# 2. Install web dependencies
npm install

# 3. Provide environment variables
# Create .env with required values (see CONFIGURATION.md for the full list)
# Never commit real secrets

# 4. Fetch mobile dependencies
cd mobile/fajrak_flutter && flutter pub get

# 5. (Mobile) Place google-services.json in android/app/
```

### Configuration Notes
- **`.env` at repo root** — shared by web and mobile; see `CONFIGURATION.md` for required keys
- **Mobile credentials** — Supabase and Firebase values are read from `.env` by the Makefile via `grep` (unanchored patterns; see Critical Rule #9)
- **Never run `flutter build appbundle --release` directly** — the Makefile passes `--dart-define` credentials; bypassing it produces a build with empty credentials (caused production login failure)

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build for Next.js |
| `npm run start` | Start production server (after `build`) |
| `npm run lint` | Run ESLint (`eslint.config.mjs`) |
| `npm run typecheck` | TypeScript strict check (`tsconfig.typecheck.json`) |
| `npm run test` | Run Jest unit/integration tests (741 tests, 78 suites) |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with coverage report |
| `npm run test:e2e` | Playwright E2E tests (needs running dev server) |
| `npm run doctor` | Full health check: audit + lint + typecheck + test:coverage + build |
| `npx supabase db push` | Apply database migrations (Supabase CLI directly) |
| `npx supabase db reset` | ⚠️ **DANGEROUS** — live prod has unmigrated tables/columns; never run against prod |

### Mobile (via Makefile in `mobile/fajrak_flutter/`)
| Command | Description |
|---------|-------------|
| `make run` | Run on connected device/emulator (includes Sentry DSN) |
| `make run-web` | Run Flutter web on `localhost:33963` |
| `make run-proxy` | Start CORS proxy on `localhost:33964` |
| `make run-web-with-proxy` | Run Flutter web against proxy (2 terminals) |
| `make build-web` | Build production web bundle |
| `make build-apk` | Build release APK |
| `make build-bundle` | Build release App Bundle for Play Store |
| `make test` | Run Flutter tests (260 tests) |
| `make test-coverage` | Run tests with coverage (HTML report) |
| `make clean` | Clean build artifacts |
| `make deps` | Update dependencies (`flutter pub upgrade`) |
| `make analyze` | Run static analysis (`flutter analyze`) |
| `make setup` | Install deps and create `.env` (manual — no `.env.example` exists) |
| `make setup-linux` | Install Linux desktop build prerequisites |

## Code Style

### Linting & Formatting
- **ESLint** — Config: `eslint.config.mjs` (extends `@next/eslint-plugin-next` with `recommended` and `core-web-vitals` rulesets)
  - Run: `npm run lint`
  - Ignores: `.next/`, `coverage/`, `mobile/`, AI agent directories (`.claude/`, `.agents/`, etc.), generated/output directories
- **TypeScript** — Strict mode via `tsconfig.typecheck.json`; run with `npm run typecheck`
- **Flutter** — Uses `flutter_lints` package; run with `make analyze` (`flutter analyze`)
- **No Prettier, Biome, or EditorConfig** — Not configured in this repo

### Key Conventions
- **Server Components by default** — Add `'use client'` only when state, effects, or browser APIs are needed
- **All user-facing strings through i18n** — Web: `lib/locales/{en,ar}/`; Mobile: `assets/i18n/` + `.tr()`
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `security(db):`
- **Every user-visible change** — Entry in `CHANGELOG.md` under `[Unreleased]`
- **Naming conventions** — See `CLAUDE.md` §Naming Conventions (PascalCase components, camelCase hooks, kebab-case API routes, numbered snake_case migrations)

## Branch Conventions

- **Main branch**: `main` (deploys to Vercel on push)
- **Branch prefixes**:
  - `feature/` — New features
  - `fix/` — Bug fixes
  - `chore/` — Maintenance, dependencies, tooling
- **Commit messages** — Conventional-ish: `feat:`, `fix:`, `refactor:`, `chore:`
- **PRs** — Squash merge to `main` (typical for Vercel deployments)

> **No `.github/PULL_REQUEST_TEMPLATE.md` exists** — the conventions above are the documented standard.

## PR Process

1. **Branch from `main`** using the appropriate prefix (`feature/`, `fix/`, `chore/`)
2. **Follow code style** — Run `npm run lint`, `npm run typecheck`, `make analyze` before pushing
3. **Write tests** — Unit/integration for new logic; E2E for critical flows
4. **Update i18n** — Add keys to both `lib/locales/en/` and `lib/locales/ar/` (web) or `assets/i18n/{en,ar}.json` (mobile)
5. **Update `CHANGELOG.md`** — Add entry under `[Unreleased]` for every user-visible change
6. **Verify external API mocks** — Curl the real endpoint and paste the actual response shape + verification date next to any test fixture (Critical Rule #13)
7. **Open PR** — Squash merge to `main` after review
8. **Deploy** — Vercel auto-deploys `main` on merge

### Reviewer Checklist (informal)
- RLS respected on all queries (`auth.uid() = user_id`)
- No hardcoded user-facing strings
- BYOK keys never logged (envelope encryption only)
- Admin client (`createAdminClient()`) used only for crons, webhooks, migrations
- Multi-currency flows tested (`original_amount` / `original_currency`)
- Quiet hours checked before push notifications (`notification_preferences`)
- Migration schema diffed against prod (prod has unmigrated tables/columns)

### Related Docs
- **Getting Started** — `docs/guides/getting-started.md` (prerequisites, first run, common issues)
- **Testing** — `docs/testing/testing.md` (test framework, running tests, coverage, CI)
- **Contributing** — `CONTRIBUTING.md` (full conventions and critical rules)
- **Architecture** — `ARCHITECTURE.md` (system overview, components, data flow)
- **Configuration** — `CONFIGURATION.md` (environment variables, config files)