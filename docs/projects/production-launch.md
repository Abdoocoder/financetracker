# Fajrak Production Launch Plan — Complete Details

---

## 📦 Project Overview

| Metric | Value |
|--------|-------|
| **App Name** | Fajrak (فجرك) |
| **Version** | 3.40.0+51 |
| **Stack** | Next.js 16 / React 19 / TS (Web) • Flutter 3.x (Mobile) • Supabase (DB/Auth/Realtime) • Firebase (FCM) • Vercel (Hosting) |
| **Repo** | `Abdoocoder/financetracker` (GitHub) |
| **Package Name** | `com.fajrak.app` (Android) / `com.fajrak.app` (iOS) |
| **Support Email** | `support@fajrak.com` |

---

## ✅ Phase 0 — Current Status (Done)

| Area | Status | Evidence |
|------|--------|----------|
| **Web Tests** | ✅ 524/524 passing | `npm test` |
| **Flutter Tests** | ✅ 135/135 passing | `flutter test` |
| **TypeScript** | ✅ Clean | `npm run typecheck` |
| **ESLint** | ✅ Clean | `npm run lint` |
| **Flutter Analyze** | ✅ Clean | `flutter analyze` |
| **Web Build** | ✅ Successful | `npm run build` |
| **Feature A (BYOK Proxy)** | ✅ Complete + tested | `/api/byok/proxy`, 7 providers |
| **Feature B (MCP Server)** | ✅ Complete + tested | `/api/mcp`, 3 tools, PAT auth |
| **Shared Config** | ✅ `SUPPORTED_PROVIDERS` synced | Web + Flutter |

---

## 📋 Phase 1 — Platform Configuration (Week 1)

### 1.1 iOS Project Setup
```bash
cd /home/ubuntu/financetracker/mobile/fajrak_flutter
flutter create --platforms=ios .
# Verify: ios/Runner/Info.plist exists
```

**Required Info.plist additions:**
```xml
<key>NSAllowsLocalNetworking</key>
<true/>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

**Bundle ID:** `com.fajrak.app`
**Team ID:** (add your Apple Developer Team ID)
**Provisioning:** Automatic or manual

### 1.2 Android Verification
- [ ] `android/app/src/main/AndroidManifest.xml` has `networkSecurityConfig`
- [ ] `android/app/src/main/res/xml/network_security_config.xml` allows `10.0.2.2`, `localhost`, `127.0.0.1`
- [ ] `google-services.json` in `android/app/`
- [ ] Keystore configured for release (`key.properties`)

### 1.3 Environment Variables

**Vercel (Web):**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://fajrak.com
CRON_SECRET=*** strong random
BYOK_PRIVATE_KEY=  # RSA-2048 PEM (base64 or raw)
BYOK_KEK_ID=  # key version, e.g. "v1"
TIMEZONE_OFFSET_HOURS=3
FIREBASE_*  # for FCM web
SENTRY_DSN=
```

**Flutter (`.env`):**
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
FLUTTER_FIREBASE_*=
```

---

## 📋 Phase 2 — Guardrails & Security (Week 1-2)

### 2.1 System Prompt (Financial Advisor + Halal Rules)

**File:** `lib/ai/system-prompt.ts` (new)
```typescript
export const FINANCIAL_ADVISOR_SYSTEM_PROMPT = `
أنت مستشار مالي إسلامي لتطبيق "فجرك". القواعد الصارمة:

1. **لا ربا أبداً**: لا تقترح قروضاً بفائدة، بطاقات ائتمان بفائدة، أو استثمارات ربوية.
2. **حلال فقط**: أسهم/صناديق متوافقة مع الشريعة (SPUS, HLAL, إلخ). تجنب: البنوك التقليدية، التأمين التجاري، الكحول، القمار، التبغ.
3. **الزكاة**: ذكر الزكاة (2.5% سنوياً على المال النامي) عند الحديث عن ثروة/مدخرات.
4. **الادخار أولاً**: صندوق طوارئ 3-6 أشهر مصاريف قبل أي استثمار.
5. **سداد الديون**: أولوية للديون ذات الفائدة العالية (avalanche method) أو الأصغر نفسياً (snowball).
6. **تنويع**: لا تضع كل البيض في سلة واحدة. حد أقصى 10-15% في أصل واحد.
7. **لا نصيحة ضريبية/قانونية**: اُحيل لمختص.
8. **لغة المستخدم**: عربي افتراضي، إنجليزي عند الطلب.
9. **لا تخمين**: قل "لا أعلم" بدلاً من اختراع أرقام.
10. **إخلاء مسؤولية**: دائماً اختم بـ "هذا ليس نصيحة مالية مهنية. استشر مستشاراً مرخصاً."
`;
```

### 2.2 MCP Tool Validation Layer

**File:** `lib/ai/mcp-guardrails.ts` (new)
```typescript
// Validate every MCP tool call before execution
export function validateMcpToolCall(tool: string, args: any, userId: string): { ok: boolean; error?: string } {
  // 1. Amount limits
  if (tool === 'create_transaction') {
    if (args.amount > 100_000) return { ok: false, error: 'Amount exceeds single-transaction limit (100k JOD)' };
    if (args.amount <= 0) return { ok: false, error: 'Amount must be positive' };
    const validCategories = args.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validCategories.includes(args.category)) return { ok: false, error: 'Invalid category for type' };
  }
  
  // 2. Rate limits per user (beyond API key limits)
  // 3. Halal category check (future: integrate with halal screening API)
  
  return { ok: true };
}
```

### 2.3 Wire into Existing Routes

**MCP Route (`app/api/mcp/route.ts`):**
```typescript
// In each tool callback, add:
const validation = validateMcpToolCall('create_transaction', args, userId);
if (!validation.ok) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: validation.error }) }], isError: true };
}
```

**BYOK Proxy (`app/api/byok/proxy/route.ts`):**
```typescript
// Inject system prompt into forwarded request if missing
if (!reqBody.payload.messages?.[0]?.system) {
  reqBody.payload.messages.unshift({ role: 'system', content: FINANCIAL_ADVISOR_SYSTEM_PROMPT });
}
```

### 2.4 `llm-trading-agent-security` Skill Integration
```bash
# Check if skill exists locally
ls ~/.hermes/skills/security/llm-trading-agent-security/
# If not, create from skill template with:
# - Spending limits per session/day
# - Prompt injection detection
# - Transaction authority controls
# - Audit logging
```

---

## 📋 Phase 3 — CI/CD Pipeline (Week 1)

### 3.1 GitHub Actions — Web (`.github/workflows/web.yml`)
```yaml
name: Web CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

### 3.2 GitHub Actions — Flutter (`.github/workflows/flutter.yml`)
```yaml
name: Flutter CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.24.x', channel: 'stable' }
      - run: cd mobile/fajrak_flutter && flutter pub get
      - run: cd mobile/fajrak_flutter && flutter analyze
      - run: cd mobile/fajrak_flutter && flutter test
```

### 3.3 Deploy Workflows
```yaml
# .github/workflows/deploy-web.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

```yaml
# .github/workflows/deploy-android.yml
on:
  release:
    types: [published]
jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: cd mobile/fajrak_flutter && flutter pub get && flutter build apk --release
      - uses: actions/upload-artifact@v4
        with: { name: 'fajrak-apk', path: 'mobile/fajrak_flutter/build/app/outputs/flutter-apk/app-release.apk' }
```

---

## 📋 Phase 4 — Supabase & Infrastructure (Week 1-2)

### 4.1 Database Migrations (Verify Applied)
```sql
-- Run in Supabase SQL Editor if not present:
-- 039_user_api_keys.sql (PAT system)
-- 043_user_byok_keys.sql (BYOK metadata)
-- 040_proxy_usage.sql (rate limiting)
-- 041_chats.sql (chat history)
-- 042_llm_providers.sql (provider configs)
-- 20260907215119_advisor_fk_indexes.sql
```

### 4.2 RLS Policies (Verify Enabled)
```sql
-- All tables must have RLS enabled:
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_byok_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- etc.
```

### 4.3 Edge Functions / Cron Jobs
```bash
# Deploy cron endpoints as Vercel Cron Jobs or Supabase pg_cron:
# /api/smart-notifications (every hour)
# /api/auto-salary (daily 6 AM)
# /api/auto-recurring (daily 9 AM)
# /api/auto-debt (daily 9 AM)
# /api/daily-reminder (6 AM, 6 PM)
# /api/weekly-report (Friday 8 AM)
# /api/zakat-reminder (daily 10 AM)
# /api/streak-alert (daily 12 PM)
# /api/evening-reminder (6 PM)
```

### 4.4 Storage Buckets
- `user-avatars` (public read, authenticated write)
- `chat-attachments` (private, user-scoped)
- `export-files` (private, user-scoped, TTL 7 days)

---

## 📋 Phase 5 — Testing & QA (Week 2)

### 5.1 Test Matrix

| Scenario | Web | Flutter | Status |
|----------|-----|---------|--------|
| **Auth**: Login/Register/Forgot/Reset | ✅ | ✅ | |
| **Auth**: Session persistence | ✅ | ✅ | |
| **Transactions**: CRUD + sync | ✅ | ✅ | |
| **Debts**: CRUD + progress | ✅ | ✅ | |
| **Budgets**: CRUD + alerts | ✅ | ✅ | |
| **Goals**: CRUD + tracking | ✅ | ✅ | |
| **Investments**: CRUD + valuation | ✅ | ✅ | |
| **Chat (Ollama local)** | ✅ | ✅ | |
| **Chat (NVIDIA NIM via proxy)** | ⏳ | ⏳ | Need API key |
| **Chat (OpenAI via proxy)** | ⏳ | ⏳ | Need API key |
| **Chat (Anthropic via proxy)** | ⏳ | ⏳ | Need API key |
| **Chat (Gemini via proxy)** | ⏳ | ⏳ | Need API key |
| **MCP: get_balances** | ✅ | N/A | |
| **MCP: get_cashflow_summary** | ✅ | N/A | |
| **MCP: create_transaction** | ✅ | N/A | |
| **MCP: Scope 403 enforcement** | ✅ | N/A | |
| **Push: FCM web** | ✅ | N/A | |
| **Push: FCM Flutter** | N/A | ✅ | |
| **Offline: Drift sync** | N/A | ✅ | |
| **i18n: AR/EN toggle** | ✅ | ✅ | |

### 5.2 Load Testing
```bash
# Web: k6 or artillery against /api/byok/proxy (30 req/min/user)
# MCP: 10 concurrent PAT keys, 100 req each
```

### 5.3 Security Testing
- [ ] OWASP ZAP scan on `https://fajrak.com`
- [ ] Dependency audit: `npm audit` + `flutter pub outdated`
- [ ] Penetration test on MCP endpoint (scope enforcement)
- [ ] Verify no secrets in build outputs

---

## 📋 Phase 6 — Deployment (Week 2-3)

### 6.1 Vercel (Web)
1. Connect `Abdoocoder/financetracker` repo
2. Set env vars (see Phase 1.3)
3. Configure custom domain: `fajrak.com` + `www.fajrak.com`
4. Enable Vercel Analytics + Speed Insights
5. Set up preview deployments for PRs

### 6.2 Play Store (Flutter)
```bash
cd mobile/fajrak_flutter
flutter build appbundle --release
# Upload: build/app/outputs/bundle/release/app-release.aab
```
**Play Console Setup:**
- Internal testing track → 10-20 testers
- Closed testing → 100-500 testers
- Open testing → Public
- Production → Staged rollout (10% → 50% → 100%)

**Store Listing (AR/EN):**
- Title: "فجرك - إدارة مالية ذكية" / "Fajrak - Smart Finance"
- Short description: Arabic + English
- Full description: Arabic + English (include halal finance, BYOK AI, MCP)
- Screenshots: 16:9 phone + 7" tablet (AR + EN)
- Feature graphic: 1024x500
- Privacy policy URL: `https://fajrak.com/privacy`
- Support email: `support@fajrak.com`

### 6.3 App Store (iOS) — Later
```bash
flutter build ipa --release
# Upload via Transporter or Xcode
```
**Requirements:** Apple Developer Program ($99/yr), App Store Connect setup, privacy manifest, export compliance.

---

## 📋 Phase 7 — Monitoring & Operations (Ongoing)

### 7.1 Observability
| Tool | Purpose | Config |
|------|---------|--------|
| **Sentry** | Error tracking (web + Flutter) | DSN in env, 100% sample rate errors, 10% transactions |
| **Vercel Analytics** | Web vitals | Auto |
| **Firebase Analytics** | Mobile events | `AnalyticsService` |
| **Supabase Logs** | DB/API errors | Daily review |
| **Uptime** | `https://fajrak.com/health` | Pingdom/Better Uptime (1-min interval) |

### 7.2 Alerting Rules
| Alert | Condition | Channel |
|-------|-----------|---------|
| API error rate > 5% | 5-min window | Telegram + Email |
| MCP 403 rate > 10% | 10-min window | Telegram |
| BYOK proxy 429 rate > 20% | 5-min window | Telegram |
| Build failure | Any | GitHub + Telegram |
| DB storage > 80% | Daily check | Email |

### 7.3 Backup & Recovery
- Supabase: Point-in-time recovery (enabled by default on Pro)
- Drift local DB: User-owned, no central backup needed
- Chat history: Export feature in settings

---

## 📋 Phase 8 — Post-Launch (Week 3-4)

### 8.1 Launch Checklist
- [ ] All CI passing on `main`
- [ ] Vercel production deployment verified
- [ ] Play Store internal test approved
- [ ] TestFlight (iOS) build uploaded
- [ ] Custom domain SSL valid
- [ ] Sentry receiving test events
- [ ] Support email `support@fajrak.com` monitored
- [ ] Privacy policy + Terms of Service live
- [ ] CHANGELOG updated for v3.40.0

### 8.2 First Week Metrics
| Metric | Target |
|--------|--------|
| Crash-free sessions | > 99.5% |
| API p95 latency | < 500ms |
| MCP tool success rate | > 99% |
| BYOK proxy 429 rate | < 1% |
| Daily active users | Baseline |
| Chat engagement (messages/user) | > 3 |

### 8.3 Iteration Plan
| Sprint | Focus |
|--------|-------|
| **Sprint 1 (Week 3-4)** | Bug fixes, user feedback, performance |
| **Sprint 2 (Week 5-6)** | iOS TestFlight → App Store, advanced AI features |
| **Sprint 3 (Week 7-8)** | Premium tier (AI Advisor), family finance, bank linking |

---

## 💰 Cost Estimate (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| **Vercel** | Pro | $20 |
| **Supabase** | Pro | $25 |
| **Firebase** | Spark (free) → Blaze | ~$5-10 |
| **Sentry** | Team | $26 |
| **GitHub Actions** | Free (public) / Pro | $0-4 |
| **Domain** | `fajrak.com` | ~$1/mo |
| **Apple Developer** | Annual | $8/mo (amortized) |
| **Play Console** | One-time | $0.25/mo (amortized) |
| **Total** | | **~$85-100/mo** |

---

## 🚀 Quick-Start Commands

```bash
# 1. iOS setup
cd /home/ubuntu/financetracker/mobile/fajrak_flutter
flutter create --platforms=ios .
# Edit ios/Runner/Info.plist → add NSAllowsLocalNetworking

# 2. Local full test
cd /home/ubuntu/financetracker
npm run doctor  # lint + typecheck + test + build
cd mobile/fajrak_flutter && make doctor  # analyze + test

# 3. Build artifacts
npm run build
cd mobile/fajrak_flutter && flutter build apk --release && flutter build appbundle --release

# 4. Deploy web (after Vercel connected)
git push origin main  # triggers deploy workflow

# 5. Upload Android bundle to Play Console
# 6. Monitor Sentry + Vercel Analytics
```

---

## 🎯 Success Criteria for "Production Ready"

| Criterion | Definition | Verification |
|-----------|------------|--------------|
| **Zero critical bugs** | No P0/P1 issues in Sentry | Sentry dashboard |
| **All tests green** | 524 web + 135 Flutter | CI pipeline |
| **Build passes** | Web + Android + iOS | Artifacts exist |
| **Deploy works** | Vercel + Play Store | Live URLs |
| **Monitoring active** | Errors alerting | Test alert fires |
| **Guardrails enforced** | MCP 403 + prompt injection blocked | Manual test |
| **Legal compliant** | Privacy policy, terms, halal disclaimer | Pages live |

---

This plan is executable as-is. Each phase has clear deliverables, commands, and verification steps.