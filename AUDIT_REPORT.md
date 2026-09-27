# Fajrak Platform — Detailed Audit Report
**Generated:** 2026-09-27
**Version:** 3.42.0 (web) / 3.42.0+54 (Flutter)
**Branch:** main (f660b80e)

---

## 1. Codebase Statistics

| Metric | Count |
|--------|-------|
| Dart files (Flutter) | 129 |
| TypeScript/TSX files (Web) | 2,133 |
| Total lines (est.) | ~150,000+ |

---

## 2. Architecture Overview

### Web (Next.js 16 + React 19 + TypeScript)
- **App Router** with route groups: `(auth)`, `(dashboard)`
- **API Routes:** `/api/byok/proxy`, `/api/byok/config`, `/api/mcp`, `/api/webhook/transaction`, `/api/api-keys/*`, `/api/cron-*`
- **State:** TanStack Query v5, custom hooks in `/hooks`
- **Styling:** Tailwind CSS, CSS variables for theming
- **i18n:** Custom system in `lib/i18n.tsx` with AR/EN per-domain files

### Mobile (Flutter 3.x)
- **State:** Provider (`AppState`), Riverpod for BYOK chat
- **Architecture:** Feature-based (`screens/`, `services/`, `widgets/`)
- **Offline:** Drift + SQLCipher (SQLite), `flutter_secure_storage`
- **i18n:** `easy_localization` with JSON assets
- **Network:** Supabase Flutter SDK, custom HTTP clients

### Backend (Supabase)
- **Database:** PostgreSQL with RLS on ALL tables
- **Auth:** Supabase Auth (email/password, OAuth)
- **RPCs:** Centralized financial logic (`get_account_balances`, `get_cashflow_summary`, `create_transaction`, etc.)
- **Tables:** 30+ tables with RLS policies

---

## 3. Features Implemented (v3.42.0)

### Feature A — BYOK Chat Assistant
| Component | Status |
|-----------|--------|
| Providers: Ollama (clientDirect), OpenRouter, NVIDIA NIM (proxy) | ✅ |
| SSE streaming | ✅ |
| Key rotation UI + re-wrap script | ✅ |
| Vault-aware filtering (only show keys on this device) | ✅ |
| Moderation layer (pre-output guardrails + DOMPurify) | ✅ |
| `/api/byok/config` endpoint (runtime provider list + public key) | ✅ |
| `/api/byok/proxy` (thin pass-through, per-user 30/min rate limit) | ✅ |
| ClientDirect Ollama (localhost:11434, emulator 10.0.2.2) | ✅ |
| Network Security Config (Android) + NSAllowsLocalNetworking (iOS) | ✅ |

### Feature B — Financial MCP Server + PAT
| Component | Status |
|-----------|--------|
| 3 tools: `get_balances`, `get_cashflow_summary`, `create_transaction` | ✅ |
| PAT auth reuse (SHA-256, scopes, 10/min rate limit) | ✅ |
| Dual scope gate (HTTP 403 + tool callback) | ✅ |
| Idempotency keys on `create_transaction` (24h TTL) | ✅ |
| Category validation (income vs expense) | ✅ |
| Unified Tool Layer (shared RPCs) | ✅ |

### Security
| Item | Status |
|------|--------|
| RLS on ALL tables | ✅ |
| BYOK envelope encryption (RSA-OAEP + AES-GCM) | ✅ |
| Key rotation (keyId on envelopes, re-wrap script) | ✅ |
| PAT expiration (90 days default) | ✅ |
| Moderation layer (pre + post output) | ✅ |
| Network Security Config (Android, LAN CIDRs) | ✅ |
| Error rescue map (70+ codes, AR/EN) | ✅ |

### Observability
| Component | Status |
|-----------|--------|
| OpenTelemetry metrics (BYOK, MCP, Crypto, Rate limits) | ✅ |
| 3 Grafana dashboards (JSON) | ✅ |
| 12 PagerDuty alerts with dedup keys | ✅ |
| 10 runbooks (markdown) | ✅ |

### Testing
| Suite | Tests | Status |
|-------|-------|--------|
| Web (Jest) | 561 | ✅ |
| Flutter | 135 | ✅ |
| E2E (Playwright) | 7 specs | ✅ |

---

## 4. Database — Live Drift Analysis

**Live DB has columns/tables NOT in migrations:**
- `profiles`: 25+ extra columns (`opening_balance`, `salary_day`, assets, phone, job_title, birth_date, avatar_url, onboarding_done, lang, lesson_streak, monthly_income, timezone, plan, currency, etc.)
- Tables without migrations: `user_stats`, `testimonials`, `saving_challenges`, `health_score_history`
- Default currency is **JOD** (not KWD)

**Performance advisories (6 WARN):**
- RLS initplan on `user_stats`, `testimonials` (3), `saving_challenges`, `health_score_history` — wrap `auth.uid()` with `(select auth.uid())`
- 21 unused indexes across 14 tables

---

## 5. Technical Debt & Risks

| Risk | Severity | Notes |
|------|----------|-------|
| DB drift (prod ≠ migrations) | 🔴 Critical | `supabase db reset` will lose prod data |
| Leaked-password protection disabled | 🟡 Medium | Supabase Auth config |
| 8 moderate npm vulns (@opentelemetry) | 🟡 Medium | Transitive, no direct fix |
| Jest worker leak (forceExit) | 🟢 Low | Acceptable, documented |
| Coverage gaps: dashboard pages 0% | 🟡 Medium | Need E2E coverage |
| Flutter cleartext (fixed in v3.42.0) | ✅ Fixed | Network Security Config added |

---

## 6. Recent Changes (Last 10 commits)

| Commit | Date | Summary |
|--------|------|---------|
| f660b80e | 2026-09-27 | DashboardLayoutProvider + env vars in web/index.html |
| cec2a904 | 2026-09-27 | run_web.sh .gitignore |
| 9742c4dc | 2026-09-27 | Firebase deps + AppState provider |
| 2ea636bd | 2026-09-27 | Analysis errors + test failures |
| 9c052522 | 2026-09-27 | brag-output .gitignore |
| 95cab76a | 2026-09-27 | Flutter web CORS fix (Supabase) |
| c921509b | 2026-09-27 | CORS fix docs |

---

## 4. Configuration Files to Sync on Version Bump

| File | Current |
|------|---------|
| `package.json` | 3.42.0 |
| `mobile/fajrak_flutter/pubspec.yaml` | 3.42.0+54 |
| `README.md` | v3.42.0 changelog |
| `README.ar.md` | Arabic changelog |
| `CLAUDE.md` | Current version line |
| `app/download/page.tsx` | Badge + APK link |
| `mobile/fajrak_flutter/README.md` | Changelog |

---

## 8. Environment Variables (20+ across 7 groups)

| Group | Key Vars |
|-------|----------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` |
| E2E | `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` |
| Firebase | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Push/VAPID | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| Market | `TWELVE_DATA_KEY`, `EXCHANGE_RATE_KEY` |
| BYOK | `BYOK_PRIVATE_KEY`, `NEXT_PUBLIC_BYOK_PUBLIC_KEY`, `NEXT_PUBLIC_BYOK_KEK_ID` |
| Cron | `CRON_SECRET` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |

---

## 9. CI/CD Pipeline

| Pipeline | Trigger | Steps |
|----------|---------|-------|
| `lint-test-build.yml` | push/PR to main | `npm ci` → `lint` → `typecheck` → `test` |
| `supabase-validate.yml` | PR | DRY-RUN migration lint (isolated stack) |
| `smart-notifications.yml` | schedule | Separate workflow |
| Deploy | push to main | Vercel auto-deploy; `make build-apk` for Play Store |

---

## 10. Recommendations

### Immediate (Sprint 1)
1. **Fix DB drift** — Create catch-up migrations for 4 prod tables + 25 profile columns
2. **Enable leaked-password protection** in Supabase Auth
3. **Add E2E tests** for BYOK chat flow, MCP auth→tool→audit, key rotation
4. **Fix coverage gaps** — dashboard pages, hooks

### Short-term (Sprint 2-3)
5. **Provider config codegen** — JSON schema → TS/Dart (deferred to v2)
6. **Per-user RSA keypairs** (key rotation v2)
7. **Remote config table** `llm_providers` (avoid app updates for model changes)

### Long-term
8. **Voice interface** (STT/TTS)
9. **Marketplace** for community MCP tools
10. **Flutter web build** (Firebase Hosting shared with Next.js)

---

## 11. Commands Reference

```bash
# Web
npm run dev           # dev server
npm run build         # production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run test          # Jest unit tests
npm run test:e2e      # Playwright E2E
npm run doctor        # full health check

# Mobile
cd mobile/fajrak_flutter
flutter pub get
flutter run
flutter test
make doctor      # analyze + test
make build-apk   # release APK
make build-aab   # release AAB
```

---

**Audit Complete** — All CI passing (561 web + 135 Flutter tests), lint ✓, typecheck ✓