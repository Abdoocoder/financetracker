# Fajrak LLM Ecosystem — PRD v4.0: Multi-Provider Router & Smart Model Selection

**Status:** Engineering Draft  
**Author:** Abdullah Abu Saghirah  
**Date:** September 2026  
**Based on:** `llm-ecosystem_prd.md` v3.2 (Feature A/B foundation) + implemented `availableModels` in providers registry

---

## 1. Executive Summary

### 1.1 Vision
Extend the Fajrak BYOK Chat Assistant (Feature A) with **intelligent model routing** — automatically selecting the optimal LLM provider/model based on task type, user preferences, cost constraints, and real-time performance metrics. Users retain full control (manual override) while gaining cost/quality optimization by default.

### 1.2 Scope
| In Scope | Out of Scope |
|----------|--------------|
| Provider registry with `availableModels` (✅ done) | New provider onboarding (handled separately) |
| Model selector dropdown in Chat UI (✅ Web + Mobile done) | Fine-tuning/custom models |
| Task-type → model routing engine | Cross-conversation memory/personalization |
| Cost tracking per user/conversation | Multi-turn agent workflows |
| Evaluation harness integration (DeepSeek Harness) | Voice/audio interfaces |
| A/B testing framework for model comparison | Plugin/extension marketplace |

### 1.3 Success Metrics
| Metric | Target |
|--------|--------|
| **Cost reduction** vs single-provider default | ≥ 60% |
| **User satisfaction** (manual override rate) | < 15% of messages |
| **Routing accuracy** (human eval) | ≥ 90% correct model choice |
| **Latency p95** (routed vs direct) | < 200ms overhead |
| **Evaluation coverage** (CI) | 100% providers tested weekly |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAJRAK SMART ROUTER LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │ Task         │───▶│ Router       │───▶│ Provider     │───▶│ Cost &   │  │
│  │ Classifier   │    │ Engine       │    │ Registry     │    │ Quality  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│        │                    │                    │                    │      │
│        ▼                    ▼                    ▼                    ▼      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    DECISION LOG (auditable)                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXISTING BYOK PROXY (Feature A)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Envelope    │  │ Rate Limit  │  │ SSRF        │  │ SSE Relay       │   │
│  │ Encryption  │  │ (30/min)    │  │ Allowlist   │  │ (verbatim)      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Provider Registry (✅ Implemented)
**Location:** `lib/byok/providers.ts` + `mobile/fajrak_flutter/lib/services/byok/providers.dart`

```typescript
interface ByokProvider {
  id: string
  name: string
  kind: 'proxy' | 'clientDirect'
  baseUrl: string
  defaultModel: string
  availableModels: string[]        // ← NEW: powers dropdown UI
  auth: ProviderAuth
  defaultHeaders?: Record<string, string>
  authHeaderName: string
  // NEW: routing metadata
  routingProfile?: ProviderRoutingProfile
}

interface ProviderRoutingProfile {
  tier: 'premium' | 'balanced' | 'budget' | 'local'
  strengths: TaskType[]           // e.g., ['reasoning', 'arabic', 'coding']
  costPer1kTokens: { input: number; output: number }  // USD estimates
  latencyP50Ms: number
  contextWindow: number
  supportsStreaming: boolean
  supportsTools: boolean
}
```

**Current Registry (7 providers):**

| Provider | Tier | Default Model | Available Models | Strengths |
|----------|------|---------------|------------------|-----------|
| **NVIDIA NIM** | balanced | `nemotron-3-ultra-550b-a55b` | 6 models | reasoning, 1M context, agentic |
| **OpenAI** | premium | `gpt-5.4-mini` | 6 models | general, tool calling |
| **Anthropic** | premium | `claude-sonnet-4-6` | 3 models | reasoning, long context |
| **Gemini** | balanced | `gemini-2.5-pro` | 3 models | multimodal, cost |
| **OpenRouter** | budget | `auto` | 4 models | model aggregation |
| **Ollama** | local | `llama3.1` | 5 models | privacy, zero cost |

---

### 3.2 Task Classifier
**Location:** `lib/byok/router/task-classifier.ts` (new)

```typescript
type TaskType = 
  | 'quick_advice'           // daily spending, budget check
  | 'deep_analysis'          // investment review, zakat calc
  | 'reasoning_heavy'        // financial planning, debt strategy
  | 'arabic_native'          // fatwa-style, Arabic-first
  | 'code_generation'        // MCP tool calls, formulas
  | 'summarization'          // monthly report, transaction grouping
  | 'vision'                 // receipt OCR, chart analysis
  | 'local_private'          // sensitive data, offline

interface ClassifiedTask {
  primaryType: TaskType
  secondaryTypes: TaskType[]
  confidence: number          // 0-1
  estimatedTokens: { input: number; output: number }
  requiresStreaming: boolean
  requiresTools: boolean
  privacyLevel: 'public' | 'user' | 'sensitive'
}
```

**Classification Pipeline:**
```
User Message → Heuristic Rules → LLM Lite (optional) → TaskType + Metadata
     │              │                    │
     │              │                    └─ Optional: 1-call to budget model
     │              └─ Keywords, length, context (instant)
     └─ Financial context (balance, debts, goals)
```

---

### 3.3 Router Engine
**Location:** `lib/byok/router/engine.ts` (new)

```typescript
interface RoutingDecision {
  providerId: string
  model: string
  reason: string                      // human-readable for UI
  fallbackChain: string[]             // providerIds in order
  estimatedCostUsd: number
  estimatedLatencyMs: number
  routingStrategy: 'auto' | 'manual' | 'cost_optimize' | 'quality_optimize'
}

class RouterEngine {
  constructor(
    private registry: ProviderRegistry,
    private costTracker: CostTracker,
    private qualitySignals: QualitySignals,
    private userPrefs: UserRoutingPrefs
  ) {}

  route(task: ClassifiedTask): RoutingDecision {
    // 1. Filter by capability
    const candidates = this.registry.filter(p => 
      p.supportsStreaming === task.requiresStreaming &&
      p.supportsTools === task.requiresTools &&
      p.contextWindow >= task.estimatedTokens.input + task.estimatedTokens.output &&
      this.privacyAllows(p, task.privacyLevel)
    )

    // Handle empty candidate set — fallback to cheapest available provider
    if (candidates.length === 0) {
      const fallback = this.registry.find(p => p.kind === 'local') 
        ?? this.registry['ollama']
        ?? Object.values(this.registry)[0]
      return {
        providerId: fallback.id,
        model: fallback.defaultModel,
        reason: 'No capable provider matched task constraints; fell back to default',
        fallbackChain: [],
        estimatedCostUsd: this.estimateCost(fallback, task),
        estimatedLatencyMs: fallback.routingProfile?.latencyP50Ms ?? 5000,
        routingStrategy: this.userPrefs.strategy
      }
    }

    // 2. Score by strategy
    const scored = candidates.map(p => ({
      provider: p,
      score: this.calculateScore(p, task)
    })).sort((a, b) => b.score - a.score)

    // 3. Apply user prefs (manual override, budget caps)
    const final = this.applyPreferences(scored[0], task)

    // 4. Build fallback chain (next 2 best)
    return {
      providerId: final.provider.id,
      model: final.provider.defaultModel,
      reason: this.generateReason(final, task),
      fallbackChain: scored.slice(1, 3).map(s => s.provider.id),
      estimatedCostUsd: this.estimateCost(final.provider, task),
      estimatedLatencyMs: final.provider.routingProfile?.latencyP50Ms ?? 5000,
      routingStrategy: this.userPrefs.strategy
    }
  }
}
```

---

### 3.4 Cost Tracker
**Location:** `lib/byok/cost-tracker.ts` (new) + DB table

```sql
-- Migration: 202609XX_byok_cost_tracking.sql
CREATE TABLE byok_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  task_type TEXT,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL,
  actual_latency_ms INT,
  routing_strategy TEXT,
  was_manual_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_byok_usage_user_date ON byok_usage_log(user_id, created_at DESC);
CREATE INDEX idx_byok_usage_provider ON byok_usage_log(provider_id);

-- RLS: users only see their own usage
ALTER TABLE byok_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage logs"
  ON byok_usage_log FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own usage logs"
  ON byok_usage_log FOR INSERT
  WITH CHECK (user_id = auth.uid());
-- No UPDATE/DELETE policies — append-only audit log

GRANT SELECT, INSERT ON byok_usage_log TO authenticated;
```

**Cost Estimation (per 1M tokens, USD):**

|| Provider/Model | Input | Output ||
|----------------|-------|--------|
| NVIDIA Nemotron Ultra | $0.00 (free tier) | $0.00 |
| NVIDIA Nemotron Super | $0.00 | $0.00 |
| OpenAI GPT-5.4-mini | $150 | $600 |
| Anthropic Sonnet 4 | $3,000 | $15,000 |
| Gemini 2.5 Pro | $1,250 | $5,000 |
| OpenRouter (auto) | variable | variable |
| Ollama (local) | $0.00 | $0.00 |

---

### 3.5 User Routing Preferences
**Location:** `lib/byok/user-prefs.ts` + `profiles` table extension

```typescript
interface UserRoutingPrefs {
  strategy: 'auto' | 'cost_optimize' | 'quality_optimize' | 'manual'
  monthlyBudgetUsd?: number          // hard cap
  preferredProviders?: string[]      // ordered preference
  excludedProviders?: string[]
  privacyMode: 'standard' | 'local_only'  // force Ollama for sensitive
  notifyOnFallback: boolean
}
```

**UI:** Settings → AI Assistant → Routing Preferences

---

## 4. User Experience

### 4.1 Chat Interface (Enhanced)
```
┌─────────────────────────────────────────────────────────────┐
│ Provider: [NVIDIA NIM ▼]  Key: [Main Key ▼]  Model: [Nemotron Ultra ▼] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💬 "كيف أوزع راتبي بين الادخار والديون؟"                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🤖 [Auto-routed: reasoning_heavy → Nemotron Ultra]     │ │
│ │ "بناءً على رصيدك 2,450 JOD والتزاماتك..."                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Type message...]                    [Stop] [Send]          │
└─────────────────────────────────────────────────────────────┘
```

**Routing Indicator:** Small badge showing `Auto-routed: task_type → model` (clickable → shows reasoning + fallback chain)

**Manual Override:** User selects different model → `was_manual_override: true` logged → router learns

---

### 4.2 Routing Preferences Screen
```
Settings → AI Assistant → Routing
┌─────────────────────────────────────────────────────────────┐
│ Strategy: [Auto ▼]                                          │
│   ├─ Auto (balanced)                                        │
│   ├─ Cost Optimize (cheapest capable)                       │
│   ├─ Quality Optimize (best available)                      │
│   └─ Manual (I choose every time)                           │
│                                                             │
│ Monthly Budget: [$5.00 ▼]  [Current: $0.23 / $5.00]         │
│                                                             │
│ Preferred Order: [NVIDIA NIM] [OpenAI] [Anthropic] [Gemini] │
│ Excluded: [ ] OpenRouter  [ ] Ollama                        │
│                                                             │
│ Privacy Mode: [Standard] [Local Only for sensitive]         │
│                                                             │
│ [Save Preferences]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.3 Cost Dashboard
```
Settings → AI Assistant → Usage & Costs
┌─────────────────────────────────────────────────────────────┐
│ This Month: $0.23 / $5.00 budget                            │
│ ┌──────────────┬────────┬─────────┬─────────┬────────────┐  │
│ │ Provider     │ Model  │ Calls   │ Tokens  │ Est. Cost  │  │
│ ├──────────────┼────────┼─────────┼─────────┼────────────┤  │
│ │ NVIDIA NIM   │ Ultra  │ 47      │ 182k    │ $0.00      │  │
│ │ OpenAI       │ 5.4-mini│ 12     │ 45k     │ $0.18      │  │
│ │ Anthropic    │ Sonnet │ 3       │ 18k     │ $0.05      │  │
│ └──────────────┴────────┴─────────┴─────────┴────────────┘  │
│                                                             │
│ [Export CSV]  [View Details]  [Set Alert at 80%]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Evaluation & Quality Assurance

### 5.1 DeepSeek Harness Integration
**Location:** `eval/` directory + CI workflow

```yaml
# .github/workflows/byok-evaluation.yml
name: BYOK Model Evaluation
on:
  schedule: [cron: '0 2 * * 1']  # Weekly Monday 2AM
  workflow_dispatch:
  push:
    paths: ['lib/byok/**', 'eval/**']

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup DeepSeek Harness
        run: pip install deepseek-harness
      - name: Run Financial QA Benchmark
        run: |
          deepseek-harness evaluate \
            --config eval/byok_benchmark.yaml \
            --providers nvidia-nim,openai,anthropic,gemini \
            --dataset eval/fajrak_financial_ar.json \
            --metrics accuracy,hallucination,arabic_quality,latency,cost \
            --output eval/results/$(date +%Y%m%d).json
      - name: Regression Check
        run: |
          deepseek-harness compare \
            --baseline eval/results/baseline.json \
            --current eval/results/$(date +%Y%m%d).json \
            --threshold 0.05 \
            --fail-on-regression
      - name: Publish Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: byok-eval-results
          path: eval/results/
```

**Benchmark Dataset:** `eval/fajrak_financial_ar.json` (500+ QA pairs)
- Zakat calculation scenarios
- Debt snowball vs avalanche
- Halal investment screening
- Budget allocation rules
- Arabic financial terminology

---

### 5.2 A/B Testing Framework
```typescript
// lib/byok/ab-test.ts
interface ABTestConfig {
  experimentId: string
  variants: {
    control: RoutingDecision
    treatment: RoutingDecision
  }
  trafficSplit: number  // 0.5 = 50/50
  durationDays: number
  successMetrics: ('user_rating' | 'cost' | 'latency' | 'override_rate')[]
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ **COMPLETE**
- [x] `availableModels` in provider registry (Web + Mobile)
- [x] Model dropdown in Chat UI (Web + Mobile)
- [x] Default model per provider (Nemotron Ultra for NVIDIA)

### Phase 2: Router Engine (Week 3-4)
| Task | Effort | Dependencies |
|------|--------|--------------|
| Task classifier (heuristic + optional LLM) | 3 days | — |
| Router engine with scoring | 4 days | Task classifier |
| Cost tracker + DB migration | 2 days | Router engine |
| User prefs UI + persistence | 3 days | Cost tracker |
| Routing indicator in chat UI | 2 days | Router engine |

### Phase 3: Evaluation & Optimization (Week 5-6)
| Task | Effort | Dependencies |
|------|--------|--------------|
| DeepSeek Harness integration | 2 days | — |
| Financial Arabic benchmark dataset | 3 days | Domain expertise |
| Weekly CI evaluation pipeline | 2 days | Harness + dataset |
| Regression alerts (Slack/email) | 1 day | CI pipeline |

### Phase 4: Advanced Features (Week 7-8)
| Task | Effort | Dependencies |
|------|--------|--------------|
| A/B testing framework | 3 days | Router + cost tracker |
| Fallback chain + auto-retry | 2 days | Router engine |
| Cost alerts + budget enforcement | 2 days | Cost tracker |
| Routing analytics dashboard | 3 days | Cost tracker + usage log |

---

## 7. Technical Specifications

### 7.1 API Extensions

#### `POST /api/byok/chat` (Enhanced)
```typescript
// Request
{
  providerId?: string           // optional — if absent, router decides
  model?: string                // optional — if absent, router decides
  routingStrategy?: 'auto' | 'cost_optimize' | 'quality_optimize'
  taskType?: TaskType           // optional hint
  messages: ChatMsg[]
  systemPrompt?: string
  stream: true
  keyId?: string                // for proxy providers
}

// Response: SSE stream (unchanged) + routing metadata in response body (not headers)
// Since routing is client-side, the decision is returned in the first SSE event:
// data: {"type":"routing","decision":{"providerId":"nvidia-nim","model":"nemotron-3-ultra","reason":"reasoning_heavy task, 1M context needed","fallbackChain":["openai","anthropic"],"estimatedCostUsd":0.00}}
```

#### `GET /api/byok/routing/stats`
```typescript
// Response
{
  totalCalls: 1247,
  totalCostUsd: 3.42,
  byProvider: {
    'nvidia-nim': { calls: 892, costUsd: 0, avgLatencyMs: 1200 },
    'openai': { calls: 234, costUsd: 2.89, avgLatencyMs: 2100 },
    'anthropic': { calls: 89, costUsd: 0.53, avgLatencyMs: 3400 }
  },
  byTaskType: { ... },
  manualOverrideRate: 0.12,
  budgetUtilization: 0.68
}
```

---

### 7.2 Database Migrations

```sql
-- 1. Cost tracking (Phase 2)
-- 202609XX_byok_cost_tracking.sql (see §3.4)

-- 2. Routing preferences (Phase 2)
-- 202609XX_byok_routing_prefs.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  routing_strategy TEXT DEFAULT 'auto' CHECK (routing_strategy IN ('auto','cost_optimize','quality_optimize','manual')),
  routing_budget_usd NUMERIC(10,2),
  routing_prefs JSONB DEFAULT '{}';

-- 3. A/B test assignment (Phase 4)
-- 202609XX_byok_ab_test.sql
CREATE TABLE byok_ab_assignment (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  experiment_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('control','treatment')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, experiment_id)
);
```

---

### 7.3 Configuration

```env
# BYOK Router Config
BYOK_ROUTER_ENABLED=true
BYOK_DEFAULT_STRATEGY=auto
BYOK_COST_TRACKING_ENABLED=true

# Provider Cost Overrides (optional, USD per 1M tokens)
BYOK_COST_NVIDIA_NEMOTRON_ULTRA_INPUT=0
BYOK_COST_NVIDIA_NEMOTRON_ULTRA_OUTPUT=0
BYOK_COST_OPENAI_GPT54_MINI_INPUT=150
BYOK_COST_OPENAI_GPT54_MINI_OUTPUT=600
# ... etc

# Evaluation
DEEPSEEK_HARNESS_API_KEY=***
EVAL_DATASET_PATH=eval/fajrak_financial_ar.json
EVAL_BASELINE_PATH=eval/results/baseline.json
```

---

## 8. Security & Compliance

### 8.1 Data Privacy
- **Routing decisions** logged without message content (only task_type, token counts)
- **Cost data** user-scoped, RLS enforced
- **No PII** in evaluation datasets (synthetic/anonymized)

### 8.2 Shariah Compliance
- Router **never routes to** providers/models known for non-halal financial advice
- System prompt guardrails (existing) + router-level provider filtering
- `llm-trading-agent-security` skill applied to all routed calls

### 8.3 Rate Limiting
- Per-user: 30/min (existing `bump_proxy_usage`)
- Per-provider: Respect upstream limits (NVIDIA free tier generous)
- Cost-based: **Advisory budget alerts** at 80%/100% — client checks before routing; proxy cannot enforce (body not parsed). See §7.1.

---

## 9. Testing Strategy

| Layer | Coverage | Tools |
|-------|----------|-------|
| **Unit** | Task classifier, router scoring, cost estimation | Jest (web), flutter_test (mobile) |
| **Integration** | Router → Proxy → Provider (mocked) | Playwright (web), integration_test (mobile) |
| **E2E** | Full chat flow with routing indicator | Playwright |
| **Benchmark** | Weekly multi-provider evaluation | DeepSeek Harness |
| **Regression** | CI gate on quality drop >5% | DeepSeek Harness compare |

---

## 10. Rollout Plan

| Phase | Audience | Configuration |
|-------|----------|---------------|
| **Alpha** | Internal team | `BYOK_ROUTER_ENABLED=true`, strategy=auto |
| **Beta** | 10% users (opt-in) | Feature flag, strategy=auto, budget=$5 |
| **GA** | All users | Default on, strategy=auto, budget=$3 |
| **Post-GA** | — | A/B test: auto vs cost_optimize |

---

## 11. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should router consider **user's historical model preference** (implicit learning)? | 🟡 Design |
| 2 | **Multi-model consensus** for high-stakes queries (zakat, large investments)? | 🔴 Deferred |
| 3 | **Streaming model switch** mid-conversation (escalate to better model)? | 🟡 Design |
| 4 | **Provider health monitoring** (auto-exclude degraded providers)? | 🟢 Planned Phase 4 |
| 5 | **Export routing logic** as MCP tool for external agents? | 🔴 Out of scope |

---

## 12. Appendix: File Map

```
lib/byok/
├── providers.ts                 # ✅ Registry with availableModels
├── providers.dart               # ✅ Mobile mirror
├── router/
│   ├── task-classifier.ts       # 🔴 New
│   ├── engine.ts                # 🔴 New
│   ├── cost-tracker.ts          # 🔴 New
│   ├── user-prefs.ts            # 🟡 Partial (needs UI)
│   └── ab-test.ts               # 🔴 Phase 4
├── client.ts                    # ✅ Proxy caller
├── envelope.ts                  # ✅ Encryption
├── chat.ts                      # ✅ Body building, SSE
└── vault.ts                     # ✅ Key storage

components/dashboard/
├── chat-assistant.tsx           # ✅ Model dropdown
└── routing-indicator.tsx        # 🔴 New component

mobile/fajrak_flutter/lib/services/byok/
├── providers.dart               # ✅ Registry with availableModels
├── chat_screen.dart             # ✅ Model dropdown
└── router/                      # 🔴 Mirror web (Phase 2)

eval/
├── fajrak_financial_ar.json     # 🔴 Benchmark dataset
├── byok_benchmark.yaml          # 🔴 Harness config
└── results/                     # 🔴 CI artifacts

supabase/migrations/
├── 202609XX_byok_cost_tracking.sql    # 🔴 Phase 2
├── 202609XX_byok_routing_prefs.sql    # 🔴 Phase 2
└── 202609XX_byok_ab_test.sql          # 🔴 Phase 4

.github/workflows/
└── byok-evaluation.yml          # 🔴 Phase 3
```

---

## 13. Approval Checklist

- [ ] **Product Owner** — Scope & priorities
- [ ] **Security** — Router logging, cost data RLS
- [ ] **Shariah Advisor** — Provider filtering rules
- [ ] **Engineering Lead** — Architecture, performance budget
- [ ] **DevOps** — CI pipeline, DeepSeek Harness integration
- [ ] **UX** — Routing indicator, preferences screen

---

**Next Action:** Begin **Phase 2 — Router Engine** implementation. Start with `task-classifier.ts` (heuristic-only, no LLM dependency) → `engine.ts` → cost tracker migration.